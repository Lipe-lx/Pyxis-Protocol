const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

async function diagnostic() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd");
    
    console.log("♠️ Pyxis Diagnostic Starting...");
    
    // Check if Program is executable
    const info = await connection.getAccountInfo(programId);
    if (!info) {
        console.log("❌ Program ID NOT found on Devnet.");
        return;
    }
    console.log(`✅ Program found. Owner: ${info.owner.toBase58()}, Executable: ${info.executable}`);

    // Load authority
    const secret = JSON.parse(fs.readFileSync("./target/deploy/authority.json", "utf8"));
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    
    const idl = JSON.parse(fs.readFileSync("./oracle-templates/jupiter-price/idl.json", "utf8"));
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    
    // Test a basic instruction to see where it fails
    const program = new anchor.Program(idl, programId, provider);
    
    console.log(`🧪 Testing connection with wallet: ${authority.publicKey.toBase58()}`);
    
    try {
        // Try to fetch an account if any exists
        const accounts = await connection.getProgramAccounts(programId);
        console.log(`📊 Found ${accounts.length} existing oracle accounts.`);
        
        if (accounts.length > 0) {
            console.log("Decoding first account...");
            const data = program.coder.accounts.decode("Oracle", accounts[0].account.data);
            console.log("✅ Decoded Oracle name:", data.name);
        }

        console.log("Attempting a safe simulation of registerOracle...");
        const oracleName = "Ace-Diagnostic";
        const [oraclePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("oracle"), authority.publicKey.toBuffer(), Buffer.from(oracleName)],
            programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), oraclePda.toBuffer()],
            programId
        );

        const tx = await program.methods
            .registerOracle(oracleName, "http://test", "test", new anchor.BN(0.1 * LAMPORTS_PER_SOL))
            .accounts({
                authority: authority.publicKey,
                oracle: oraclePda,
                stakeVault: vaultPda,
                systemProgram: anchor.web3.SystemProgram.id,
            })
            .transaction();
        
        const sim = await connection.simulateTransaction(tx, [authority]);
        if (sim.value.err) {
            console.log("❌ Simulation Error:", JSON.stringify(sim.value.err));
            console.log("Logs:", sim.value.logs);
        } else {
            console.log("🚀 Simulation Success!");
        }

    } catch (e) {
        console.error("❌ Diagnostic failed:", e.message);
    }
}

diagnostic();
