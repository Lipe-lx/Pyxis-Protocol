const { Connection } = require("@solana/web3.js");

async function checkTx() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const txSig = "4vFXunDvKjJYQpmzeYihbctLpjuxGKUpFqFqcNwxp1r4WMtMbXu7cpJgcRmzSuP1buwUYXwncR4N7uYRWqgYv9fo";
    
    console.log("Analyzing Transaction:", txSig);
    try {
        const tx = await connection.getParsedTransaction(txSig, {
            maxSupportedTransactionVersion: 0
        });
        
        if (tx) {
            console.log("Instructions Program IDs:");
            tx.transaction.message.instructions.forEach((ix, i) => {
                console.log(`[${i}] ${ix.programId.toBase58()} (${ix.program})`);
                if (ix.parsed && ix.parsed.type === "deployWithMaxDataLen") {
                    console.log("🚀 FOUND DEPLOY INSTRUCTION!");
                    console.log("Program being deployed:", ix.parsed.info.programAccount);
                }
            });
        } else {
            console.log("Transaction not found.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkTx();
