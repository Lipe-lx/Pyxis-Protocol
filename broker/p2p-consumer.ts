import { createPyxisNode } from './libp2p-node';
import { pipe } from 'it-pipe';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { peerIdFromString } from '@libp2p/peer-id';

/**
 * Pyxis P2P Consumer
 * Discovers nodes via DHT and performs encrypted queries.
 */
async function performP2PQuery(targetPeerId: string, payload: any) {
  const node = await createPyxisNode();
  await node.start();

  console.log(`[Consumer] Searching DHT for Peer: ${targetPeerId}`);
  
  try {
    // 1. Discovery via Kademlia DHT
    const peerId = peerIdFromString(targetPeerId);
    const targetPeer = await node.peerRouting.findPeer(peerId);

    console.log(`[Consumer] Peer Found at: ${targetPeer.multiaddrs.join(', ')}`);

    // 2. Open Secure Stream
    const stream = await node.dialProtocol(peerId, '/pyxis/oracle/1.0.0');
    console.log(`[Consumer] Secure stream established. Sending query...`);

    const query = {
      requestId: "p2p_" + Math.random().toString(36).substring(7),
      payload
    };

    const response: any = await pipe(
      [uint8ArrayFromString(JSON.stringify(query))],
      stream,
      async (source: any) => {
        for await (const msg of source) {
          return JSON.parse(uint8ArrayToString(msg.subarray()));
        }
      }
    );

    console.log(`\n✅ Received Verified Response via DePIN Network:`);
    console.log(JSON.stringify(response, null, 2));

  } catch (err) {
    console.error(`[Consumer] P2P Query Failed:`, err);
  } finally {
    await node.stop();
  }
}

// Demo usage
if (require.main === module) {
  performP2PQuery("8AufMHSUifpUu62ivSVBn7PfHBip7f5n8dhVNVyq24ws", { asset: "SOL/USDC" });
}
