import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, SecurityHelper, RaydiumHelper, MeteoraHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3006;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORACLE_NAME = 'cross-dex-safety-sentinel';

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../jupiter-price/idl.json'), 'utf-8'));

// Load keypair
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

async function boot() {
  console.log(`♠️ Pyxis Safety Sentinel: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle registered.");
  } catch (e) {
    console.log("⏳ Registering Safety Sentinel Oracle NFT...");
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    await devnetClient.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'security_audit', 1.5);
    console.log(`✅ Registered!`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  const { poolAddress, dex } = req.body;
  
  try {
    console.log(`🔎 Auditing ${dex} pool: ${poolAddress}...`);
    
    let poolState;
    if (dex === 'raydium') {
      poolState = await RaydiumHelper.getPoolState(connection, new PublicKey(poolAddress));
    } else if (dex === 'meteora') {
      poolState = await MeteoraHelper.getYieldMetrics(connection, new PublicKey(poolAddress));
    } else {
      throw new Error("Unsupported DEX for audit.");
    }

    // 1. Run Security Audit
    const audit = await SecurityHelper.auditPool(connection, poolState);
    
    // 2. Format Response
    const response = {
      oracle: oracleKeypair.publicKey.toBase58(),
      query_id: `sec_${Date.now()}`,
      type: 'security_audit',
      result: {
        dex,
        pool: poolAddress,
        ...audit,
        recommendation: audit.safetyScore > 80 ? 'Safe to Trade' : 'High Risk - Rug Likely'
      },
      timestamp: Date.now()
    };

    // 3. Sync reputation
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, response.query_id, 0.015).catch(console.error);

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Safety Sentinel running on port ${PORT}`));
