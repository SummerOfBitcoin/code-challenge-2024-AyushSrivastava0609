const fs = require('fs');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

// Load transactions from mempool
const mempoolDir = './mempool';
const transactions = [];
fs.readdirSync(mempoolDir).forEach(file => {
  const filePath = `${mempoolDir}/${file}`;
  const transaction = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  transactions.push(transaction);
});

// Validate transactions
const validTransactions = [];
transactions.forEach(transaction => {
  // Check if transaction is valid (e.g. correct format, valid signatures, etc.)
  if (validateTransaction(transaction)) {
    validTransactions.push(transaction);
  }
});

// Calculate total transaction fees
let totalFees = 0;
validTransactions.forEach(transaction => {
  transaction.vin.forEach(input => {
    totalFees += input.prevout.value;
  });
  transaction.vout.forEach(output => {
    totalFees -= output.value;
  });
});

// Create coinbase transaction
const coinbaseTransaction = {
  version: 1,
  locktime: 0,
  vin: [],
  vout: [
    {
      scriptpubkey: '76a9146085312a9c500ff9cc35b571b0a1e5efb7fb9f1688ac',
      scriptpubkey_asm: 'OP_DUP OP_HASH160 OP_PUSHBYTES_20 6085312a9c500ff9cc35b571b0a1e5efb7fb9f16 OP_EQUALVERIFY OP_CHECKSIG',
      scriptpubkey_type: 'p2pkh',
      scriptpubkey_address: '19oMRmCWMYuhnP5W61ABrjjxHc6RphZh11',
      value: 2500000 + totalFees // 25 BTC reward + total transaction fees
    }
  ]
};

// Mine block
const blockHeader = {
  version: 1,
  prevBlockHash: '0000000000000000000000000000000000000000000000000000000000000000',
  merkleRoot: getMerkleRoot(validTransactions.concat([coinbaseTransaction])),
  timestamp: Math.floor(Date.now() / 1000),
  bits: 0x1903a30c, // difficulty target
  nonce: 0
};

let blockHash;
do {
  blockHash = getBlockHash(blockHeader);
  blockHeader.nonce++;
} while (blockHash > '0000ffff00000000000000000000000000000000000000000000000000000000');

// Write output to file
const outputFile = 'output.txt';
fs.writeFileSync(outputFile, `Block Header: ${getBlockHeaderString(blockHeader)}\n`);
fs.appendFileSync(outputFile, `Serialized Coinbase Transaction: ${getTransactionString(coinbaseTransaction)}\n`);
validTransactions.forEach(transaction => {
  fs.appendFileSync(outputFile, `Transaction ID: ${JSON.stringify(transaction.vin[0].txid)}\n`); // Assuming txid is within the first input
});

// Helper functions
function validateTransaction(transaction) {
  // Check if transaction has valid vin and vout
  if (!transaction.vin || transaction.vin.length === 0 || !transaction.vout || transaction.vout.length === 0) {
    return false;
  }

  // Check if transaction has valid signatures
  transaction.vin.forEach(input => {
    const scriptSig = input.scriptSig;
    const scriptPubKey = input.prevout.scriptPubKey;
    if (!input.prevout.txid) {
      return false;
    }
    const messageHash = crypto.createHash('sha256');
    messageHash.update(input.prevout.txid);
    const publicKey = secp256k1.publicKeyCreate(input.prevout.scriptPubKey);
    const isValid = secp256k1.verify(messageHash.digest(), scriptSig, publicKey);
    if (!isValid) {
      return false;
    }
  });

  return true;
}

function getMerkleRoot(transactions) {
  const hashes = transactions.map(transaction => {
    const txHash = crypto.createHash('sha256');
    txHash.update(JSON.stringify(transaction));
    return txHash.digest('hex');
  });
  const merkleRoot = crypto.createHash('sha256');
  merkleRoot.update(hashes.reduce((a, b) => a + b, ''));
  return merkleRoot.digest('hex');
}

function getBlockHash(blockHeader) {
  const blockHash = crypto.createHash('sha256');
  blockHash.update(JSON.stringify(blockHeader));
  return blockHash.digest('hex');
}
function getBlockHeaderString(blockHeader) {
  return `Version: ${blockHeader.version.toString(16).padStart(8, '0')}, 
  Previous BlockHash: ${blockHeader.prevBlockHash.padStart(64, '0')},
  MerkleRoot: ${blockHeader.merkleRoot.padStart(64, '0')},
  TimeStamp: ${blockHeader.timestamp.toString(16).padStart(8, '0')},
  Bits: ${blockHeader.bits.toString(16).padStart(8, '0')},
  Nonce: ${blockHeader.nonce.toString(16).padStart(8, '0')}`;
}

function getTransactionString(transaction) {
  return JSON.stringify(transaction);
}
