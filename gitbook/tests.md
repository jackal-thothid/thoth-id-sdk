# Tests

This project includes a suite of tests to ensure the SDK is working correctly. This page explains how to run the tests and what each test script does.

## Running the Tests

Before running the tests, you need to make sure you have all the dependencies installed:

```bash
npm install
```

Then, you need to set up the test environment. This includes starting a local Hathor network and a mock API for the contract IDs. The `test:setup` script handles this for you.

```bash
npm run test:setup
```

Once the setup is complete, you can run the tests using one of the following commands:

*   `npm test`: Runs the main test suite.
*   `npm run test:verbose`: Runs the tests with verbose output, which can be useful for debugging.

## Test Scripts

Here's a breakdown of the test scripts available in the `package.json` file:

*   `"test": "jest tests/sdk.test.ts"`: This is the main test command. It runs the tests in the `tests/sdk.test.ts` file.
*   `"test:verbose": "jest tests/sdk.verbose.test.ts"`: This command runs the tests in verbose mode, providing more detailed output.
*   `"test:setup": "ts-node tests/setup.ts"`: This script sets up the test environment. It starts a local Hathor network and a mock API for the contract IDs. You need to run this script before running the tests.
