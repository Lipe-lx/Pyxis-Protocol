const { Connection, PublicKey } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

async function checkProgram() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q");
    
    console.log("Checking program at:", programId.toBase58());
    const info = await connection.getAccountInfo(programId);
    
    if (info) {
        console.log("Program exists!");
        console.log("Owner:", info.owner.toBase58());
        console.log("Executable:", info.executable);
    } else {
        console.log("Program not found on Devnet.");
    }
}

checkProgram();
