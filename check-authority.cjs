const { Keypair } = require("@solana/web3.js");
const fs = require("fs");
const key = JSON.parse(fs.readFileSync("target/deploy/authority.json", "utf-8"));
const k = Keypair.fromSecretKey(new Uint8Array(key));
console.log(k.publicKey.toString());
