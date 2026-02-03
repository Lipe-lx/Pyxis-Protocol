import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

/**
 * Pyxis SDK ♠️
 * 
 * A client-side library for agents to interact with the Pyxis Oracle Protocol.
 */
export class PyxisClient {
  public program: any;
  public connection: Connection;
  public programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: any,
    idl: any,
    programId: string = 'EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q'
  ) {
    this.connection = connection;
    this.programId = new PublicKey(programId);
    
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    
    this.program = new anchor.Program(idl, this.programId, provider);
  }

  /**
   * Derive the PDA for an oracle account
   */
  public getOraclePda(authority: PublicKey, name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('oracle'),
        authority.toBuffer(),
        Buffer.from(name)
      ],
      this.programId
    );
  }

  /**
   * Find all registered oracles
   */
  public async listOracles(): Promise<any[]> {
    return await this.program.account.oracle.all();
  }

  /**
   * Get specific oracle data
   */
  public async getOracle(pda: PublicKey): Promise<any> {
    return await this.program.account.oracle.fetch(pda);
  }

  /**
   * Query an oracle via HTTP (MCP-compliant)
   */
  public async queryOracle(endpoint: string, queryBody: any, paymentSignature?: string): Promise<any> {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (paymentSignature) {
      headers['x-402-payment'] = paymentSignature;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });
    
    if (!response.ok) {
      throw new Error(`Oracle query failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Prepare an x402 payment transaction
   */
  public async createPaymentTransaction(
    consumer: PublicKey,
    oracleWallet: PublicKey,
    amountLamports: number
  ): Promise<Transaction> {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: consumer,
        toPubkey: oracleWallet,
        lamports: amountLamports,
      })
    );
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = consumer;
    
    return tx;
  }
}
