import express from 'express';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PyxisClient } from '../sdk/src/index'; // Using src since dist might not be built
import fs from 'fs';
import { expect } from 'chai';

/**
 * T10: Discrepancy Detection & Automated Slashing Test ♠️
 */
describe("T10: Auditor 'The Watchman' Integration", () => {
    let mockPrice = 100.0;
    let server: any;
    const PORT = 4001;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
    const client = new PyxisClient(provider.connection, provider.wallet as any, idl);
    
    const oracleName = "Mock-Oracle-T10";
    const [oraclePda] = client.getOraclePda(provider.wallet.publicKey, oracleName);
    
    before(async () => {
        // 1. Start Mock MCP Server
        const app = express();
        app.use(express.json());
        app.post('/query', (req, res) => {
            res.json({
                query_id: "test-query",
                result: { price: mockPrice }
            });
        });
        server = app.listen(PORT);

        // 2. Register Oracle on-chain
        try {
            await client.registerOracle(
                oracleName, 
                `http://localhost:${PORT}/query`, 
                "price", 
                0.1
            );
        } catch (e) {
            console.log("Oracle already registered or registration failed:", e.message);
        }
    });

    after(() => {
        server.close();
    });

    it("Auditor should slash if price discrepancy > 5%", async () => {
        // Set mock price to 120 (20% above the 'truth' of 100)
        mockPrice = 120.0;
        const truthPrice = 100.0;
        const threshold = 0.05;

        // Fetch oracle state before
        const oracleBefore = await client.getOracle(oraclePda);
        const stakeBefore = oracleBefore.stakeAmount.toNumber();

        console.log(`🔍 Current Reported Price: ${mockPrice}, Truth: ${truthPrice}`);

        // Run Auditor Logic (Simplified for test)
        const response = await client.queryOracle(`http://localhost:${PORT}/query`, { asset: 'SOL/USDC' });
        const reportedPrice = response.result.price;
        
        const diff = Math.abs(reportedPrice - truthPrice);
        const diffPct = diff / truthPrice;

        if (diffPct > threshold) {
            console.log("🚨 Discrepancy detected! Slashing...");
            await client.reportOracle(oraclePda, "Test Slash: Price too high");
        }

        // Verify Slashing
        const oracleAfter = await client.getOracle(oraclePda);
        const stakeAfter = oracleAfter.stakeAmount.toNumber();

        expect(stakeAfter).to.be.below(stakeBefore);
        expect(oracleAfter.reputationScore).to.be.below(oracleBefore.reputationScore);
        console.log(`✅ Slashing confirmed. Stake dropped from ${stakeBefore} to ${stakeAfter}`);
    });

    it("Auditor should IGNORE small discrepancies (< 5%)", async () => {
        // Set mock price to 102 (2% discrepancy)
        mockPrice = 102.0;
        const truthPrice = 100.0;
        const threshold = 0.05;

        const oracleBefore = await client.getOracle(oraclePda);
        const stakeBefore = oracleBefore.stakeAmount.toNumber();

        console.log(`🔍 Current Reported Price: ${mockPrice}, Truth: ${truthPrice}`);

        const response = await client.queryOracle(`http://localhost:${PORT}/query`, { asset: 'SOL/USDC' });
        const reportedPrice = response.result.price;
        
        const diff = Math.abs(reportedPrice - truthPrice);
        const diffPct = diff / truthPrice;

        if (diffPct > threshold) {
            await client.reportOracle(oraclePda, "Should NOT happen");
        } else {
            console.log("✅ Discrepancy within tolerance. No action taken.");
        }

        const oracleAfter = await client.getOracle(oraclePda);
        expect(oracleAfter.stakeAmount.toNumber()).to.equal(stakeBefore);
    });
});
