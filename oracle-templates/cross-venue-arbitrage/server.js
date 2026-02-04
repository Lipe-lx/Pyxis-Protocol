import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, PhoenixHelper, JupiterHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3003;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORACLE_NAME = 'cross-venue-arbitrage-oracle';
const SOL_USDC_MARKET = new PublicKey('4DoN929WjocvunpsBVkH13S61oU1KUn7mK3Rj9xL2fC2'); // Phoenix SOL/USDC

// Load IDL (reusing from jupiter-price)
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
  console.log(`♠️ Pyxis Arbitrage Oracle: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle registered.");
  } catch (e) {
    console.log("⏳ Registering Arbitrage Oracle NFT...");
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    await devnetClient.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'arbitrage', 1.0);
    console.log(`✅ Registered!`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  try {
    // 1. Fetch from Phoenix (CLOB)
    const phxSnapshot = await PhoenixHelper.getMarketSnapshot(connection, SOL_USDC_MARKET);
    
    // 2. Fetch from Jupiter (AMM)
    const jupSnapshot = await JupiterHelper.getPrice('SOL');

    // 3. Calculate Arbitrage
    const diff = Math.abs(phxSnapshot.bestBid - jupSnapshot.price);
    const profitPct = (diff / jupSnapshot.price) * 100;
    
    const arbitrageData = {
      asset: 'SOL/USDC',
      phoenix: { bid: phxSnapshot.bestBid, ask: phxSnapshot.bestAsk },
      jupiter: { price: jupSnapshot.price },
      spread_basis_points: Math.round(profitPct * 100),
      recommendation: phxSnapshot.bestBid > jupSnapshot.price ? 'buy_jupiter_sell_phoenix' : 'buy_phoenix_sell_jupiter',
      is_profitable: profitPct > 0.05 // Threshold for bot alerts
    };

    // 4. Sync reputation
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, `arb_${Date.now()}`, 0.005).catch(console.error);

    res.json({
      oracle: oracleKeypair.publicKey.toBase58(),
      type: 'arbitrage_signal',
      result: arbitrageData,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Arbitrage Oracle running on port ${PORT}`));
