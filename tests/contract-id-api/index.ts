import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

const contractsPath = path.join(__dirname, 'contracts.json');

app.get('/contract-ids', (req, res) => {
  fs.readFile(contractsPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading contracts file');
      return;
    }
    res.json(JSON.parse(data));
  });
});

app.post('/contract-id', (req, res) => {
  const { key, value } = req.body;

  fs.readFile(contractsPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading contracts file');
      return;
    }
    const contracts = JSON.parse(data);
    contracts[key] = value;
    fs.writeFile(contractsPath, JSON.stringify(contracts, null, 2), (err) => {
      if (err) {
        res.status(500).send('Error writing contracts file');
        return;
      }
      res.status(200).send('Contract ID updated');
    });
  });
});

const port = process.env.PORT || 3232;
app.listen(port, () => {
  console.log(`Mock API server listening on port ${port}`);
});
