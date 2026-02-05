import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../sdk/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const AUDIT_THRESHOLD_BPS = 500; // 5% (500 basis points) difference triggers audit

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));

// Load auditor keypair (The one that earns the bounty!)
const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
let auditorKeypair;
try {
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  auditorKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
  auditorKeypair = Keypair.generate();
}

const connection = new Connection(RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(auditorKeypair);
const client = new PyxisClient(connection, wallet, idl);

/**
 * Auditor Agent Loop ♠️
 * 
 * "The Watchman of the Pyxis Network"
 */
async function startAuditing() {
  console.log(`🔍 Auditor Agent active: ${auditorKeypair.publicKey.toBase58()}`);
  console.log(`🎯 Threshold: ${AUDIT_THRESHOLD_BPS / 100}% discrepancy triggers slashing.`);

  while (true) {
    try {
      // 1. Fetch all registered oracles
      const oracles = await client.listOracles();
      console.log(`🌐 Scanning ${oracles.length} active oracles...`);

      for (const { publicKey: pda, account: oracle } of oracles) {
        if (!oracle.isActive) continue;

        // 2. Audit Price Oracles
        if (oracle.dataType === 'price' || oracle.dataType === 'clob_microstructure') {
          await auditPriceOracle(pda, oracle);
        }
      }

    } catch (err) {
      console.error('❌ Audit cycle failed:', err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 60000)); // Scan every minute
  }
}

async function auditPriceOracle(pda, oracle) {
  try {
    console.log(`🔎 Auditing: ${oracle.name} (${oracle.mcpEndpoint})`);

    // 1. Query the oracle
    const response = await client.queryOracle(oracle.mcpEndpoint, {
      type: oracle.dataType,
      asset: 'SOL/USDC'
    });

    const reportedPrice = response.result.price || response.result.value?.bestBid;
    if (!reportedPrice) return;

    // 2. Compare against "Global Truth" (Benchmark)
    const globalTruth = 100.0; // Simulated global median
    const globalDiff = Math.abs(reportedPrice - globalTruth);
    const globalDiffBps = (globalDiff / globalTruth) * 10000;

    if (globalDiffBps > AUDIT_THRESHOLD_BPS) {
      console.log(`⚠️ Potential Discrepancy: ${globalDiffBps} bps. Verifying PROVENANCE...`);
      
      const venueTruth = await verifyVenuePrice(oracle.name, reportedPrice);
      
      if (Math.abs(reportedPrice - venueTruth) < 10) { 
          console.log(`✅ ALPHA DETECTED: ${oracle.name} is accurate to its venue. Skipping slash.`);
          
          // Log Alpha for future "Golden Mine" productization
          const alphaReport = {
              timestamp: new Date().toISOString(),
              oracle: oracle.name,
              reportedPrice,
              globalTruth,
              discrepancyBps: globalDiffBps,
              type: "MARKET_ARBITRAGE"
          };
          fs.appendFileSync(path.join(__dirname, 'alpha-discoveries.log'), JSON.stringify(alphaReport) + '\n');
      } else {
          console.warn(`🚨 FRAUD DETECTED: Oracle lied about local venue price.`);
          await client.reportOracle(pda, `Fraud detected: Price mismatch at venue ${oracle.name}`);
      }
    } else {
      console.log(`✅ ${oracle.name} is accurate within global limits.`);
    }

  } catch (e) {
    console.warn(`⚠️ Could not query ${oracle.name}: ${e.message}`);
  }
}

async function verifyVenuePrice(venueName, reportedPrice) {
    // MOCK: In a real Auditor, this would be a direct RPC call to the 
    // DEX program on Solana to verify the account state at that slot.
    if (venueName.includes("Phoenix")) return reportedPrice; // Verify local truth
    return 100.0; // Global truth for others
}

startAuditing();
