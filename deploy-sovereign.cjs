const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = '/home/node/.openclaw/workspace/Pyxis-Protocol/target/deploy/authority.json';
const PROGRAM_ID = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";

async function main() {
  console.log("♠️ Pyxis Deployment Plan: Minting Sovereign Oracle NFT");
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  const idl = JSON.parse(fs.readFileSync("./ui/src/idl.json", "utf-8"));
  const program = new anchor.Program(idl, provider);

  // Data for the new Oracle
  const oracleName = "Ace-P2P-Sovereign";
  const endpoint = "https://pyxis-broker.lulipe-lx.workers.dev";
  const dataType = "DePIN AI Oracle";
  const stakeAmount = new anchor.BN(0.1 * 1e9); // 0.1 SOL

  // Derive PDAs
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), wallet.publicKey.toBuffer(), Buffer.from(oracleName)],
    new PublicKey(PROGRAM_ID)
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), oraclePda.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  console.log(`📍 Wallet: ${wallet.publicKey.toString()}`);
  console.log(`📍 New Oracle PDA: ${oraclePda.toString()}`);
  console.log(`📍 Endpoint: ${endpoint}`);

  console.log("\n🚀 Executing Mint...");

  try {
    // Attempting register_oracle (Anchor often camelCases this to registerOracle)
    const method = program.methods.registerOracle || program.methods.register_oracle;
    
    if (!method) {
        throw new Error("Could not find register instruction in IDL. Check method names.");
    }

    const tx = await method(oracleName, endpoint, dataType, stakeAmount)
      .accounts({
        authority: wallet.publicKey,
        oracle: oraclePda,
        stakeVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`\n✅ DEPLOYMENT SUCCESSFUL`);
    console.log(`🔗 Transaction ID: ${tx}`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
  } catch (err) {
    console.error("\n❌ DEPLOYMENT FAILED");
    console.error("Error Log:", err);
    if (err.logs) {
        console.error("Program Logs:", err.logs);
    }
  }
}

main();
