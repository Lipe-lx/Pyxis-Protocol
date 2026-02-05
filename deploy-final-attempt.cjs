const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_PATH = '/home/node/.openclaw/workspace/Pyxis-Protocol/target/deploy/authority.json';
const PROGRAM_ID = "Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd";

async function main() {
  console.log("♠️ Pyxis Strategic Mint: Ace-P2P-Sovereign");
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  
  // Using the more standard auditor-agent IDL for method naming
  const idl = JSON.parse(fs.readFileSync("./auditor-agent/idl.json", "utf-8"));
  const program = new anchor.Program({ ...idl, address: PROGRAM_ID }, provider);

  const oracleName = "Ace-P2P-Sovereign";
  const endpoint = "https://pyxis-broker.lulipe-lx.workers.dev";
  const dataType = "DePIN AI Oracle";
  const stakeAmount = new anchor.BN(0.1 * 1e9);

  // Derive PDAs
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), wallet.publicKey.toBuffer(), Buffer.from(oracleName)],
    new PublicKey(PROGRAM_ID)
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), oraclePda.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  console.log(`🚀 Deploying to Devnet via ${wallet.publicKey.toString()}...`);

  try {
    const tx = await program.methods
      .registerOracle(oracleName, endpoint, dataType, stakeAmount)
      .accounts({
        authority: wallet.publicKey,
        oracle: oraclePda,
        stakeVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`\n✅ SOVEREIGN NFT MINTED`);
    console.log(`📍 PDA: ${oraclePda.toString()}`);
    console.log(`🔗 TX: ${tx}`);
  } catch (err) {
    console.error("\n❌ MINT FAILED");
    console.error(err);
  }
}

main();
