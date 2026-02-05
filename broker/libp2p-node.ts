import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@libp2p/noise';
import { mplex } from '@libp2p/mplex';
import { kadDHT } from '@libp2p/kad-dht';
import { identify } from '@libp2p/identify';
import { bootstrap } from '@libp2p/bootstrap';

/**
 * Pyxis P2P Node Configuration
 * Standardized across Workers and Consumers for the DePIN network.
 */
export async function createPyxisNode() {
  const node = await createLibp2p({
    transports: [webSockets()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    services: {
      identify: identify(),
      dht: kadDHT({
        protocol: '/pyxis/kad/1.0.0',
        clientMode: false,
      }),
    },
    peerDiscovery: [
      bootstrap({
        list: [
          // Bootstrap nodes help us enter the DHT
          '/dns4/node-0.pyxis.lulipe-lx.workers.dev/tcp/443/wss/p2p/QmBootstrapNodePlaceHolder'
        ]
      })
    ]
  });

  return node;
}
