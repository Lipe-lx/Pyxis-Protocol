import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, LiquidityArbHelper, MeteoraHelper, RaydiumHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3007;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORACLE_NAME = 'liquidity-arbitrage-optimizer';

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
  console.log(`♠️ Pyxis Liquidity Arb Oracle: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle registered.");
  } catch (e) {
    console.log("⏳ Registering Liquidity Arb Oracle NFT...");
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    await devnetClient.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'liquidity_arb', 2.0);
    console.log(`✅ Registered!`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  const { pair, amountUSD, sourceVenue, targetVenue } = req.body;
  
  try {
    console.log(`📊 Analyzing LP Migration for ${pair} (${amountUSD} USD) from ${sourceVenue} to ${targetVenue}...`);
    
    // 1. Get Yield Data (Simulated)
    const sourceYield = 12.5; // Source APR %
    const targetYield = 45.2; // Target APR %

    // 2. Run Cost/Time Calculation
    const analysis = await LiquidityArbHelper.calculateMigrationROI(
      sourceYield,
      targetYield,
      amountUSD
    );
    
    // 3. Format Response
    const response = {
      oracle: oracleKeypair.publicKey.toBase58(),
      query_id: `larb_${Date.now()}`,
      type: 'liquidity_arbitrage_signal',
      result: {
        pair,
        amountUSD,
        source: { venue: sourceVenue, apr: sourceYield },
        target: { venue: targetVenue, apr: targetYield },
        migrationAnalysis: analysis,
        recommendation: analysis.isProfitable ? `MIGRATE_TO_${targetVenue.toUpperCase()}` : 'HOLD_CURRENT_POSITION'
      },
      timestamp: Date.now()
    };

    // 4. Sync reputation
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, response.query_id, 0.02).catch(console.error);

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Liquidity Arb Optimizer running on port ${PORT}`));
