import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const ORACLE_NAME = 'jupiter-price-template';

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));

// Load keypair (Standard location)
const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
let oracleKeypair;
try {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
  oracleKeypair = Keypair.generate();
}

const connection = new Connection(RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(oracleKeypair);
const client = new PyxisClient(connection, wallet, idl);

const app = express();
app.use(express.json());

/**
 * Register the template oracle on-chain
 */
async function boot() {
  console.log(`♠️ Pyxis Oracle Template: ${ORACLE_NAME}`);
  console.log(`Pubkey: ${oracleKeypair.publicKey.toBase58()}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle already registered.");
  } catch (e) {
    console.log("⏳ Registering oracle identity NFT...");
    const tx = await client.registerOracle(
      ORACLE_NAME,
      `http://localhost:${PORT}/oracle/query`,
      'price',
      0.1 // 0.1 SOL stake
    );
    console.log(`✅ Registered! TX: ${tx}`);
  }
}

boot();

/**
 * Background Heartbeat Loop
 */
async function maintainHeartbeat() {
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  while (true) {
    try {
      await client.sendHeartbeat(pda);
      console.log('❤️ Heartbeat sent on-chain');
    } catch (e) {
      console.warn('💔 Heartbeat failed (Oracle likely not registered yet)');
    }
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 mins
  }
}

maintainHeartbeat();

app.post('/oracle/query', async (req, res) => {
  const { asset } = req.body;
  
  // Mock price logic (Replace with real API)
  const price = 105.42; 
  
  // Sync to blockchain (Fire and forget reputation build)
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  client.recordQuery(pda, `q_${Date.now()}`).catch(console.error);

  res.json({
    oracle: oracleKeypair.publicKey.toBase58(),
    result: { price, asset, timestamp: Date.now() }
  });
});

app.listen(PORT, () => console.log(`🚀 Oracle template running on port ${PORT}`));
