import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, PhoenixHelper, BackpackHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3004;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const ORACLE_NAME = 'backpack-cex-dex-bridge';
const SOL_MARKET = 'SOL_USDC';
const PHOENIX_SOL_USDC = new PublicKey('4DoN929WjocvunpsBVkH13S61oU1KUn7mK3Rj9xL2fC2');

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
  console.log(`♠️ Pyxis Backpack Bridge Oracle: ${ORACLE_NAME}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle registered.");
  } catch (e) {
    console.log("⏳ Registering Backpack Bridge Oracle NFT...");
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    await devnetClient.registerOracle(ORACLE_NAME, `http://localhost:${PORT}/oracle/query`, 'arbitrage_cex', 2.0); // Alpha tier
    console.log(`✅ Registered!`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  try {
    // 1. Fetch from Backpack (CEX)
    const bpkSnapshot = await BackpackHelper.getTicker(SOL_MARKET);
    
    // 2. Fetch from Phoenix (DEX)
    const phxSnapshot = await PhoenixHelper.getMarketSnapshot(connection, PHOENIX_SOL_USDC);

    // 3. Calculate CEX-DEX Disparity
    const diff = Math.abs(bpkSnapshot.lastPrice - phxSnapshot.bestBid);
    const profitPct = (diff / bpkSnapshot.lastPrice) * 100;
    
    const bridgeData = {
      asset: 'SOL/USDC',
      backpack: { price: bpkSnapshot.lastPrice, type: 'CEX' },
      phoenix: { bid: phxSnapshot.bestBid, ask: phxSnapshot.bestAsk, type: 'DEX' },
      arbitrage_profit_pct: profitPct.toFixed(4),
      withdrawal_latency_est: "2-5 mins", // Typical for Backpack
      recommendation: bpkSnapshot.lastPrice < phxSnapshot.bestBid ? 'buy_backpack_sell_phoenix' : 'buy_phoenix_sell_backpack',
      is_profitable_after_fees: profitPct > 0.1 // Higher threshold for CEX withdrawal fees
    };

    // 4. Sync reputation
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, `bpk_${Date.now()}`, 0.01).catch(console.error);

    res.json({
      oracle: oracleKeypair.publicKey.toBase58(),
      type: 'cex_dex_arbitrage',
      result: bridgeData,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Backpack Bridge Oracle running on port ${PORT}`));
