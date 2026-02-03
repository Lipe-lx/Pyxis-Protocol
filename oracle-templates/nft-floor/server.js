import express from 'express';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PORT = process.env.PORT || 3002;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const MAGIC_EDEN_API = 'https://api-mainnet.magiceden.dev/v2';
const QUERY_PRICE_LAMPORTS = 5000; // 0.000005 SOL per query
const PROGRAM_ID = new PublicKey('EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q');
const ORACLE_NAME = 'nft-floor-oracle';

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));

// Load oracle keypair
const keypairPath = process.env.KEYPAIR_PATH || path.join(__dirname, '../../target/deploy/pyxis-keypair.json');
let oracleKeypair;
try {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
  // Fallback to default system keypair if available
  try {
    const sysKeypairPath = path.join(process.env.HOME, '.config/solana/id.json');
    const keypairData = JSON.parse(fs.readFileSync(sysKeypairPath, 'utf-8'));
    oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (sysErr) {
    console.warn('No keypair found, generating ephemeral one for demo');
    oracleKeypair = Keypair.generate();
  }
}

const connection = new Connection(RPC_URL, 'confirmed');

// Setup Anchor Provider
const wallet = new anchor.Wallet(oracleKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});
const program = new anchor.Program(idl, PROGRAM_ID, provider);

const app = express();
app.use(express.json());

// Derive PDAs
const [oraclePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('oracle'), oracleKeypair.publicKey.toBuffer(), Buffer.from(ORACLE_NAME)],
  PROGRAM_ID
);

const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), oraclePda.toBuffer()],
  PROGRAM_ID
);

/**
 * Register oracle if not exists
 */
async function ensureOracleRegistered() {
  try {
    await program.account.oracle.fetch(oraclePda);
    console.log(`Oracle "${ORACLE_NAME}" online.`);
  } catch (e) {
    console.log(`Registering NFT Floor Oracle...`);
    try {
      await program.methods
        .registerOracle(
          ORACLE_NAME,
          `http://localhost:${PORT}/oracle/query`,
          'nft-floor',
          new BN(0.1 * LAMPORTS_PER_SOL)
        )
        .accounts({
          authority: oracleKeypair.publicKey,
          oracle: oraclePda,
          stakeVault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (regError) {
      console.warn('Registration pending contract update.');
    }
  }
}

ensureOracleRegistered();

// Collection mapping (Slugs)
const COLLECTIONS = {
  'SMB': 'solana_monkey_business',
  'DEGODS': 'degods',
  'MADLADS': 'mad_lads',
  'CLAYNOSAURZ': 'claynosaurz',
  'TENSORIANS': 'tensorians',
};

/**
 * Fetch floor from Magic Eden
 */
async function fetchNFTFloor(slug) {
  try {
    const url = `${MAGIC_EDEN_API}/collections/${slug}/stats`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      floorPrice: data.floorPrice / 1000000000, // Convert lamports to SOL
      listedCount: data.listedCount,
      volume: data.volumeAll / 1000000000,
    };
  } catch (e) {
    return null;
  }
}

// ============== MCP ENDPOINTS ==============

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', type: 'nft-floor', oracle: oracleKeypair.publicKey.toBase58() });
});

app.post('/oracle/query', async (req, res) => {
  const { type, collection } = req.body;
  
  if (type !== 'nft-floor' || !collection) {
    return res.status(400).json({ error: 'INVALID_QUERY' });
  }

  const slug = COLLECTIONS[collection.toUpperCase()] || collection.toLowerCase();
  const floorData = await fetchNFTFloor(slug);

  if (!floorData) {
    return res.status(404).json({ error: 'COLLECTION_NOT_FOUND' });
  }

  // Record on-chain (Fire and forget for demo)
  program.methods
    .recordQuery(`nft_${Date.now()}`, new BN(0))
    .accounts({ authority: oracleKeypair.publicKey, oracle: oraclePda })
    .rpc()
    .catch(() => {});

  res.json({
    oracle: oracleKeypair.publicKey.toBase58(),
    collection: slug,
    floorPriceSOL: floorData.floorPrice,
    stats: {
      listed: floorData.listedCount,
      volume: floorData.volume
    },
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`NFT Floor Oracle running on port ${PORT}`);
});
