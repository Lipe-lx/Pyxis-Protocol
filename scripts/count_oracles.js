const web3 = require('@solana/web3.js');

const programId = new web3.PublicKey('Ge8XrfHuQwaojtg6DYGZrmU4gadKXtEqwXrEETU7sqfd');
const connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');

(async () => {
    try {
        console.log("Fetching accounts owned by program:", programId.toString());
        const accounts = await connection.getProgramAccounts(programId);
        
        console.log("---------------------------------------------------");
        console.log(`Total "NFTs" (Oracle Accounts) found: ${accounts.length}`);
        
        // Optional: Print some details if any exist
        accounts.forEach((acc, i) => {
            console.log(`[${i+1}] Pubkey: ${acc.pubkey.toString()} | Data Size: ${acc.account.data.length} bytes`);
        });
        console.log("---------------------------------------------------");
    } catch (e) {
        console.error("Error fetching accounts:", e);
    }
})();
