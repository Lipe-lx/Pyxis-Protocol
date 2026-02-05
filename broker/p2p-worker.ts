import { createPyxisNode } from './libp2p-node';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import { pipe } from 'it-pipe';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';

export class PyxisP2PWorker {
  private node: any = null;
  private oracleId: string;
  private keypair: Keypair;

  constructor(oracleId: string, keypair: Keypair) {
    this.oracleId = oracleId;
    this.keypair = keypair;
  }

  async start(logic: (params: any) => Promise<any>) {
    console.log(`♠️ Pyxis DePIN Node Starting...`);
    this.node = await createPyxisNode();
    await this.node.start();

    const peerId = this.node.peerId.toString();
    console.log(`[Node] P2P Node ID: ${peerId}`);
    console.log(`[Node] Multiaddresses: ${this.node.getMultiaddrs().map((m: any) => m.toString()).join(', ')}`);
    console.log(`[Node] Register this PeerID on your Oracle NFT for discovery.`);

    // 1. Listen for the Pyxis Oracle Protocol
    this.node.handle('/pyxis/oracle/1.0.0', async ({ stream }: any) => {
      console.log(`[Node] Incoming Secure Stream from Consumer...`);

      await pipe(
        stream,
        async function* (source: any) {
          for await (const msg of source) {
            const query = JSON.parse(uint8ArrayToString(msg.subarray()));
            console.log(`[Node] Executing Logic for Query: ${query.requestId}`);

            try {
              const result = await logic(query.payload);

              // 🛡️ CRITICAL SECURITY: Signing local execution
              const messageToSign = JSON.stringify(result.data);
              const signature = nacl.sign.detached(decodeUTF8(messageToSign), this.keypair.secretKey);

              const signedPayload = {
                ...result,
                signature: Buffer.from(signature).toString('base64'),
                signer: this.keypair.publicKey.toString(),
                peerId: this.node.peerId.toString()
              };

              yield uint8ArrayFromString(JSON.stringify(signedPayload));
            } catch (err) {
              console.error(`[Node] Execution Error:`, err);
            }
          }
        },
        stream
      );
    });

    console.log(`[Node] Oracle Service LIVE via libp2p.`);
  }
}
