const { Keypair } = require("@solana/web3.js");
const fs = require("fs");

const k = Keypair.generate();
const keyPath = "test-hot-wallet.json";
fs.writeFileSync(keyPath, JSON.stringify(Array.from(k.secretKey)));
console.log(k.publicKey.toString());
