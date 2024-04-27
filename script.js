const crypto = require('crypto');
const fs = require('fs');
const { promisify } = require('util');

// Constants
const difficulty = '0000ffff00000000000000000000000000000000000000000000000000000000';
const mempool = './mempool';
const output_loc = './output.txt';

// Function to read JSON files from mempool folder
const readMempoolFiles = async () => {
    const readdir = promisify(fs.readdir);
    const files = await readdir(mempool);
    const transactions = [];

    for (const file of files) {
        const data = require(`${mempool}/${file}`);
        transactions.push(data);
    }

    return transactions;
};

// Function to validate a single transaction
const validateTransaction = (transaction) => {
    if (transaction.vin.value != transaction.vout.value ) {
        return false;
    }
    return true; // Transaction is considered valid for now
};

// Function to calculate the hash of a block header
const calcBlockHash = (blockHeader) => {
    return crypto.createHash('sha256').update(JSON.stringify(blockHeader)).digest('hex');
};

// Function to mine a block
const mineBlock = async (transactions) => {
    console.log('Mining block...');
    let nonce = 0;
    let blockHash = '';
    while (!blockHash.startsWith(difficulty)) {
        const blockHeader = { nonce, transactions };
        blockHash = calcBlockHash(blockHeader);
        console.log(`Nonce: ${nonce}, Block Hash: ${blockHash}`);
        nonce++;
    }
    console.log('Block mined successfully.');
    return { nonce, blockHash };
};

// Main function to execute transaction validation and block mining
const main = async () => {
    try {
        // Read transactions from mempool folder
        console.log('Reading mempool files...');
        const transactions = await readMempoolFiles();
        console.log('Mempool files read:', transactions);

        // Validate each transaction
        console.log('Validating transactions...');
        const validTransactions = transactions.filter((transaction, index) => {
            const isValid = validateTransaction(transaction);
            console.log(`Transaction ${index + 1}: ${isValid ? 'Valid' : 'Invalid'}`);
            return isValid;
        });
        console.log('Valid transactions:', validTransactions);

        // Mine the block
        const { nonce, blockHash } = await mineBlock(validTransactions);

        // Write block header and transactions to output file
        const outputData = `Block Header: Nonce - ${nonce}, Hash - ${blockHash}\n`;
        const serializedTransactions = validTransactions.map(tx => tx.txid).join('\n');
        const output = `${outputData}Serialized Coinbase Transaction: ${serializedTransactions}`;
        
        fs.writeFileSync(output_loc, output);
        console.log('Mining completed. Output written to output.txt');
    } catch (error) {
        console.error('Error:', error);
    }
};

// Execute main function
main();
