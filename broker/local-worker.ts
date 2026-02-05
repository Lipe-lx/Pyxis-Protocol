/**
 * Pyxis Local Worker SDK
 * Allows any device (browser/terminal) to act as a Pyxis Oracle node.
 */

import WebSocket from 'ws';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

export class PyxisLocalWorker {
  private ws: WebSocket | null = null;
  private oracleId: string;
  private brokerUrl: string;
  private keypair: Keypair;

  constructor(oracleId: string, keypair: Keypair, brokerUrl: string = 'ws://localhost:3000') {
    this.oracleId = oracleId;
    this.brokerUrl = brokerUrl;
    this.keypair = keypair;
  }

  async start(logic: (params: any) => Promise<any>) {
    console.log(`♠️ Pyxis Node Active: ${this.oracleId}`);
    console.log(`🔐 Signing enabled for Public Key: ${this.keypair.publicKey.toString()}`);
    
    const url = `${this.brokerUrl}?oracleId=${this.oracleId}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log(`[Node] Connection secured with P2P Broker.`);
    });

    this.ws.on('message', async (message) => {
      const data = JSON.parse(message.toString());

      if (data.type === 'QUERY_REQUEST') {
        console.log(`[Node] Processing Query: ${data.requestId}`);
        
        try {
          const result = await logic(data.payload);
          
          // 🛡️ CRITICAL SECURITY: Signing the data locally with Ed25519
          const messageToSign = JSON.stringify(result.data);
          const messageBytes = Buffer.from(messageToSign, 'utf-8');
          const signature = nacl.sign.detached(messageBytes, this.keypair.secretKey);
          
          const signedPayload = {
            ...result,
            signature: Buffer.from(signature).toString('base64'),
            signer: this.keypair.publicKey.toString()
          };

          this.ws?.send(JSON.stringify({
            type: 'QUERY_RESPONSE',
            requestId: data.requestId,
            payload: signedPayload
          }));
          
          console.log(`[Node] Query signed and delivered.`);
        } catch (err) {
          console.error(`[Node] Execution Error:`, err);
        }
      }
    });

    this.ws.on('close', () => {
      console.log(`[Node] Offline. Reconnecting...`);
      setTimeout(() => this.start(logic), 5000);
    });
  }
}
