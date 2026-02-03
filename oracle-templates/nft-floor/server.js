import express from 'express';
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3002;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const ORACLE_NAME = 'nft-floor-template';

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));

// Use a unique keypair for the NFT template
const keypairPath = path.join(__dirname, 'nft-keypair.json');
let oracleKeypair;
if (fs.existsSync(keypairPath)) {
  oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))));
} else {
  oracleKeypair = Keypair.generate();
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(oracleKeypair.secretKey)));
}

const connection = new Connection(RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(oracleKeypair);
const client = new PyxisClient(connection, wallet, idl);

const app = express();
app.use(express.json());

async function boot() {
  console.log(`🖼️ Pyxis NFT Floor Template: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
  } catch (e) {
    console.log("⏳ Registering NFT Floor identity...");
    // Note: Needs airdrop to this keypair if running for the first time
    try {
      await client.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'nft-floor', 0.1);
      console.log("✅ NFT Oracle Registered.");
    } catch (err) {
      console.warn("⚠️ Registration failed (likely insufficient SOL).");
    }
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  const { collection } = req.body;
  const floorPrice = 18.5; // Mock data

  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  client.recordQuery(pda, `nft_${Date.now()}`).catch(() => {});

  res.json({
    oracle: oracleKeypair.publicKey.toBase58(),
    collection,
    floorPriceSOL: floorPrice,
    timestamp: Date.now()
  });
});

app.listen(PORT, () => console.log(`🚀 NFT template running on port ${PORT}`));
