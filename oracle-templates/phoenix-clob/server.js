import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient, PhoenixHelper } from '../../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3002;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'; // Need mainnet for real orderbooks
const ORACLE_NAME = 'phoenix-microstructure-oracle';
const SOL_USDC_MARKET = new PublicKey('4DoN929WjocvunpsBVkH13S61oU1KUn7mK3Rj9xL2fC2'); // Example Market

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
  console.log(`♠️ Pyxis Phoenix Microstructure Oracle: ${ORACLE_NAME}`);
  console.log(`Pubkey: ${oracleKeypair.publicKey.toBase58()}`);
  
  const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
  
  try {
    await client.getOracle(pda);
    console.log("✅ Oracle already registered.");
  } catch (e) {
    console.log("⏳ Registering Phoenix Oracle NFT...");
    // In hackathon, we use Devnet for registration but Mainnet for data source
    const devnetClient = new PyxisClient(new Connection('https://api.devnet.solana.com'), wallet, idl);
    const tx = await devnetClient.registerOracle(
      ORACLE_NAME,
      `http://localhost:${PORT}/oracle/query`,
      'clob_microstructure',
      0.5 // Higher stake for premium alpha
    );
    console.log(`✅ Registered! TX: ${tx}`);
  }
}

boot();

app.post('/oracle/query', async (req, res) => {
  const { asset, params } = req.body;
  
  try {
    // 1. Fetch Real-time data from Phoenix
    console.log(`🔍 Fetching microstructure for ${asset}...`);
    const snapshot = await PhoenixHelper.getMarketSnapshot(connection, SOL_USDC_MARKET);
    
    // 2. Format to Pyxis MCP Spec
    const response = PhoenixHelper.toPyxisResponse(snapshot, oracleKeypair.publicKey);
    
    // 3. Optional: Add x402 payment requirements logic here
    
    // 4. Sync reputation (Record query on Pyxis devnet program)
    const [pda] = client.getOraclePda(oracleKeypair.publicKey, ORACLE_NAME);
    client.recordQuery(pda, response.query_id, 0.001).catch(e => console.error('Reputation sync failed', e));

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Phoenix Oracle running on port ${PORT}`));
