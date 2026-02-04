import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, MeteoraHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3005;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORACLE_NAME = 'meteora-real-yield-oracle';
const SOL_USDC_DLMM = new PublicKey('AR9pS9SU9Uf8p5h5g4g5g4g5g4g5g4g5g4g5g4g5g4g'); // Mock DLMM address

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
  console.log(`♠️ Pyxis Meteora Yield Oracle: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle registered.");
  } catch (e) {
    console.log("⏳ Registering Meteora Yield Oracle NFT...");
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    await devnetClient.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'yield_analytics', 1.0);
    console.log(`✅ Registered!`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  const { asset, params } = req.body;
  
  try {
    // 1. Fetch Real-time Yield Metrics from Meteora DLMM
    console.log(`🔍 Calculating Real Volume (5m) for ${asset}...`);
    const metrics = await MeteoraHelper.getYieldMetrics(connection, SOL_USDC_DLMM);
    
    // 2. Format to Pyxis MCP Spec
    const response = {
      oracle: oracleKeypair.publicKey.toBase58(),
      query_id: `met_${Date.now()}`,
      type: 'yield_analytics',
      result: {
        value: metrics,
        unit: 'real_yield_bps',
        timestamp: metrics.timestamp,
        confidence: metrics.confidence_score
      },
      proof: {
        signature: "simulated_signature",
        message: JSON.stringify(metrics)
      }
    };

    // 3. Sync reputation (High payout for premium yield signals)
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, response.query_id, 0.02).catch(console.error);

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Meteora Yield Oracle running on port ${PORT}`));
