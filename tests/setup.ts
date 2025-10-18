import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'cross-fetch';

// --- Helper function to generate random string ---
function random_string(length: number, chars: string) {
    let result = '';
    for (let i = length; i > 0; --i) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// --- Helper function to load config ---
function load_config(file_name: string) {
    const config_path = path.resolve(__dirname, file_name);
    return JSON.parse(fs.readFileSync(config_path, 'utf-8'));
}

// --- Helper function to write config ---
function write_config(file_name: string, data: any) {
    const config_path = path.resolve(__dirname, file_name);
    fs.writeFileSync(config_path, JSON.stringify(data, null, 2));
}

async function get_wallet_history(wallet_id: string, headless_api_key: string, host: string, port: number) {
    const url = `http://${host}:${port}/wallet/tx-history/?limit=1`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': headless_api_key,
            'x-wallet-id': wallet_id
        }
    });

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to get wallet history: ${response.status} ${response.statusText} - ${error_text}`);
    }

    const result = await response.json();
    console.log('Wallet history retrieved successfully.');
    console.log(result);
    return result;
}

async function wait_new_block(wallet_id: string, headless_api_key: string, host: string, port: number) {
    let attempts = 0;
    const max_attempts = 60;

    while (attempts < max_attempts) {
        try {
            const wallet_history = await get_wallet_history(wallet_id, headless_api_key, host, port);
            // Check if history is valid and block is confirmed
            if (wallet_history && wallet_history.length > 0 && wallet_history[0].first_block != null) {
                console.log(`New block found after ${attempts + 1} attempts.`);
                return; // Success, exit the function
            }
        } catch (error) {
            console.warn(`Attempt ${attempts + 1} failed when fetching wallet history:`, error);
            // We can choose to continue retrying or handle specific errors
        }

        attempts++;
        if (attempts < max_attempts) {
            console.log(`Waiting for new block... (Attempt ${attempts}/${max_attempts})`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
    }

    console.warn(`Max attempts (${max_attempts}) reached waiting for a new block. Proceeding without confirmation.`);
}

// --- Main setup flow ---
async function setup() {
    try {
        const env_config = load_config('test-env.json');
        let test_config = load_config('test-config.json');

        // Generate random names
        const random_hex = crypto.randomBytes(3).toString('hex');
        const master_wallet_id = `master_wallet_id_${random_hex}`;
        const existing_name = `name${random_hex}`;

        // Update configs with random names
        env_config.master_id = master_wallet_id;
        test_config.testData.existingName = existing_name;
        console.log('\nGenerated random master_wallet_id:', master_wallet_id);
        console.log('Generated random existingName:', existing_name);

        // Update test-config.json with node url
        const nodeUrl = `http://${env_config.node_wallet_host}:${env_config.node_wallet_port}/`;
        test_config.sdkOptions = {
            nodeUrl: nodeUrl
        };
        console.log('Updating test-config.json with nodeUrl:', nodeUrl);

        await start_master_wallet(env_config);

        console.log('\nWaiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const address_master = await get_address_master(env_config);
        
        // Update test-config.json with the new master address
        test_config.testData.ownerAddress = address_master;
        test_config.testData.managerAddress = address_master;
        console.log('Updating test-config.json with new master address:', address_master);

        console.log('\nWaiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const create_contract_response = await create_nano_contract(env_config, address_master);
        
        const contract_id = create_contract_response.hash;
        // Update test-config.json with the new contract_id
        test_config.sdkOptions.contractId = contract_id;
        console.log('Updating test-config.json with new contract_id:', contract_id);

        write_config('test-env.json', env_config);
        write_config('test-config.json', test_config);
        console.log('Configuration files updated successfully.');

        console.log('\nWaiting 5 seconds...');
        await wait_new_block(env_config.master_id, env_config.headless_api_key, env_config.master_wallet_host, env_config.master_wallet_port);

        await create_name(env_config, test_config, contract_id, address_master);
        await wait_new_block(env_config.master_id, env_config.headless_api_key, env_config.master_wallet_host, env_config.master_wallet_port);

        console.log('\nSetup completed successfully.');

    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

async function start_master_wallet(config: any) {
    console.log('\n--- Starting Master Wallet ---');
    const {
        master_wallet_host,
        master_wallet_port,
        headless_api_key,
        master_id,
        master_seedkey
    } = config;

    if (headless_api_key === 'YOUR_HEADLESS_API_KEY') {
        throw new Error('Please replace "YOUR_HEADLESS_API_KEY" in tests/test-env.json with your actual API key.');
    }

    const url = `http://${master_wallet_host}:${master_wallet_port}/start`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': headless_api_key
        },
        body: JSON.stringify({
            'wallet-id': master_id,
            'seedKey': master_seedkey
        })
    });

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to start master wallet: ${response.status} ${response.statusText} - ${error_text}`);
    }

    const result = await response.json();
    console.log('Master wallet started successfully.');
    console.log(result);
    return result;
}

async function get_address_master(config: any) {
    console.log('\n--- Getting Master Address ---');
    const {
        master_wallet_host,
        master_wallet_port,
        headless_api_key,
        master_id
    } = config;

    const url = `http://${master_wallet_host}:${master_wallet_port}/wallet/address`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': headless_api_key,
            'x-wallet-id': master_id
        }
    });

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to get master address: ${response.status} ${response.statusText} - ${error_text}`);
    }

    const result = await response.json();
    console.log('Response from /wallet/address:', result);

    if (!result.address) {
        throw new Error("Could not get master address. Response: " + JSON.stringify(result));
    }
    
    console.log('Master address retrieved successfully.');
    return result.address;
}

async function create_nano_contract(env_config: any, address_master: string) {
    console.log('\n--- Creating Nano Contract ---');
    const {
        master_wallet_host,
        master_wallet_port,
        headless_api_key,
        master_id,
        blueprint_id
    } = env_config;

    const random_alpha = random_string(4, 'abcdefghijklmnopqrstuvwxyz');

    const url = `http://${master_wallet_host}:${master_wallet_port}/wallet/nano-contracts/create`;
    const body = {
        "blueprint_id": blueprint_id,
        "address": address_master,
        "data": {
            "actions": [],
            "args": [
                random_alpha,
                1,
                20,
                50,
                1000,
                5,
                10000,
                30
            ]
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': headless_api_key,
            'x-wallet-id': master_id
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to create nano contract: ${response.status} ${response.statusText} - ${error_text}`);
    }

    const result = await response.json();
    console.log('Nano contract created successfully.');
    console.log(result);
    if (!result.hash) {
        throw new Error("Could not find 'hash' property in the response from /wallet/nano-contracts/create.");
    }
    return result;
}

async function create_name(env_config: any, test_config: any, contract_id: string, address_master: string) {
    console.log('\n--- Creating Name ---');
    const {
        master_wallet_host,
        master_wallet_port,
        headless_api_key,
        master_id
    } = env_config;

    const url = `http://${master_wallet_host}:${master_wallet_port}/wallet/nano-contracts/execute`;
    const body = {
        "nc_id": contract_id,
        "method": "create_name",
        "address": address_master,
        "data": {
            "actions": [
                {
                    "type": "deposit",
                    "token": "00",
                    "amount": 20
                }
            ],
            "args": [
                test_config.testData.existingName,
                crypto.randomBytes(3).toString('hex').slice(0, 5)
            ]
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': headless_api_key,
            'x-wallet-id': master_id
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to create name: ${response.status} ${response.statusText} - ${error_text}`);
    }

    const result = await response.json();
    console.log('Name created successfully.');
    console.log(result);
    return result;
}

setup();