/**
 * Pyxis Protocol - Auditor Mock Test ♠️
 * 
 * Simulates a discrepancy detection loop without requiring full Mocha/Chai setup.
 */
const { Connection, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

const IDL_PATH = "./oracle-templates/jupiter-price/idl.json";
const PROGRAM_ID = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";

async function runMockAudit() {
    console.log("🔍 Starting Auditor 'The Watchman' Mock Test...");
    
    // Setup Mock Environment
    const truthPrice = 100.0;
    const badPrice = 120.0; // 20% discrepancy
    const threshold = 0.05; // 5%
    
    console.log(`📊 Parameters: Truth=$${truthPrice}, Threshold=${threshold*100}%`);
    
    // Simulate Oracle Query
    console.log("📡 Querying Oracle endpoint...");
    const reportedPrice = badPrice; 
    console.log(`📥 Oracle Reported: $${reportedPrice}`);
    
    // Discrepancy Logic
    const diff = Math.abs(reportedPrice - truthPrice);
    const diffPct = diff / truthPrice;
    
    if (diffPct > threshold) {
        console.warn(`🚨 DISCREPANCY: ${Math.round(diffPct * 100)}% detected!`);
        console.log("🔨 Action: Triggering on-chain Slashing via report_oracle...");
        console.log("✅ Mock Success: Slashing instruction would be sent now.");
    } else {
        console.log("✅ Accuracy within limits. No action.");
    }
}

runMockAudit();
