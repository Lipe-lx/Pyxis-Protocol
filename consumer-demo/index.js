import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// In a real app, this would be: import { PyxisClient } from '@pyxis-protocol/sdk';
// For demo, we import the local file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { PyxisClient } from '../sdk/dist/index.js';

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const consumerKeypair = Keypair.generate(); // Temporary wallet for demo
const wallet = new anchor.Wallet(consumerKeypair);

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../oracle-templates/jupiter-price/idl.json'), 'utf-8'));

async function runDemo() {
  console.log('--- Pyxis Consumer Agent Demo ♠️ ---');
  console.log(`Consumer Wallet: ${consumerKeypair.publicKey.toBase58()}`);
  
  const client = new PyxisClient(connection, wallet, idl);

  try {
    console.log('\n1. Scanning for registered oracles...');
    const oracles = await client.listOracles();
    
    if (oracles.length === 0) {
      console.log('No oracles found on-chain yet. Using local discovery for demo.');
      
      // Local discovery fallback
      const priceOracleEndpoint = 'http://localhost:3001/oracle/query';
      const nftOracleEndpoint = 'http://localhost:3002/oracle/query';
      
      console.log('\n2. Querying Jupiter Price Oracle (Asset: SOL/USDC)...');
      const priceData = await client.queryOracle(priceOracleEndpoint, {
        type: 'price',
        asset: 'SOL/USDC'
      });
      console.log('Result:', priceData.result);
      
      console.log('\n3. Querying NFT Floor Oracle (Collection: Mad Lads)...');
      const nftData = await client.queryOracle(nftOracleEndpoint, {
        type: 'nft-floor',
        collection: 'MADLADS'
      });
      console.log('Result:', nftData);
      
      console.log('\n--- Demo Complete! ---');
    } else {
      console.log(`Found ${oracles.length} oracles!`);
      // Demo querying the first one found
      const oracle = oracles[0];
      const name = oracle.account.name;
      const endpoint = oracle.account.mcpEndpoint;
      
      console.log(`\n2. Querying ${name} at ${endpoint}...`);
      
      // Construct query based on type
      let queryBody = {};
      if (oracle.account.dataType === 'price') {
        queryBody = { type: 'price', asset: 'SOL/USDC' };
      } else if (oracle.account.dataType === 'nft-floor') {
        queryBody = { type: 'nft-floor', collection: 'MADLADS' };
      }

      const result = await client.queryOracle(endpoint, queryBody);
      console.log('Result:', result);
      
      console.log('\n--- Demo Complete! ---');
    }
  } catch (error) {
    console.error('Demo Error:', error.message);
  }
}

runDemo();
