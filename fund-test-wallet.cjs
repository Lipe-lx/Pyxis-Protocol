const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const authKey = JSON.parse(fs.readFileSync("target/deploy/authority.json", "utf-8"));
  const authWallet = Keypair.fromSecretKey(new Uint8Array(authKey));
  
  const destPubkey = new PublicKey("4X5qm8HR3mrAnKoDUn49yN8vcVA8k8zA7QyAbSrCMxdU");
  
  console.log(`Sending 0.1 SOL from ${authWallet.publicKey.toString()} to ${destPubkey.toString()}...`);
  
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authWallet.publicKey,
      toPubkey: destPubkey,
      lamports: 100000000, // 0.1 SOL
    })
  );
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [authWallet]);
    console.log("Success! TX:", sig);
  } catch (err) {
    console.error("Failed:", err);
  }
}

main();
