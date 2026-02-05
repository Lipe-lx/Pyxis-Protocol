/**
 * Pyxis Protocol - Auditor "Alpha vs Fraud" Mock Test ♠️
 * 
 * Demonstrates the Double-Verification logic to distinguish between
 * legitimate market arbitrage and actual data fraud.
 */

async function runAlphaTest() {
    console.log("🔍 Starting Advanced Auditor 'The Watchman' Test...");
    
    const globalTruth = 100.0;
    const threshold = 0.05; // 5%
    
    const cases = [
        { 
            name: "Accurate Oracle", 
            reported: 100.1, 
            venuePrice: 100.1, 
            desc: "Close to global price" 
        },
        { 
            name: "Arbitrage Oracle", 
            reported: 110.0, 
            venuePrice: 110.0, 
            desc: "Divergent from global, but ACCURATE to its local venue (Phoenix)" 
        },
        { 
            name: "Fraudulent Oracle", 
            reported: 125.0, 
            venuePrice: 100.0, 
            desc: "Divergent from global AND lying about local venue price" 
        }
    ];

    for (const c of cases) {
        console.log(`\n--- Case: ${c.name} ---`);
        console.log(`📊 Reported: $${c.reported} | Global Truth: $${globalTruth}`);
        
        const globalDiff = Math.abs(c.reported - globalTruth) / globalTruth;
        
        if (globalDiff > threshold) {
            console.log(`⚠️ Divergence Detected (${Math.round(globalDiff*100)}%). Verifying Provenance at source...`);
            
            // Step 2: Cross-check with the specific venue
            const localDiff = Math.abs(c.reported - c.venuePrice) / c.venuePrice;
            
            if (localDiff < 0.001) { // Within 10 bps
                console.log(`✅ [VALID ALPHA]: Oracle is reporting real local data. NO SLASH.`);
                console.log(`🚀 Strategic Advantage: We just found a ${Math.round(globalDiff*100)}% arbitrage opportunity!`);
            } else {
                console.warn(`🚨 [FRAUD]: Oracle lied about venue price. Initiating Hard Slashing!`);
                console.log(`🔨 Action: report_oracle(pda, "Venue price mismatch")`);
            }
        } else {
            console.log(`✅ [STABLE]: Oracle is within global tolerance.`);
        }
    }
}

runAlphaTest();
