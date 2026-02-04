import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pyxis P2P Broker Server
 * Coordinates signaling between Consumer Agents and Local Oracle Workers.
 */

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Registry of online local workers
const workers = new Map<string, WebSocket>();
const pendingQueries = new Map<string, (data: any) => void>();

wss.on('connection', (ws, req) => {
  const oracleId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('oracleId');
  
  if (!oracleId) {
    ws.close();
    return;
  }

  console.log(`[Broker] Oracle Worker Connected: ${oracleId}`);
  workers.set(oracleId, ws);

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());
    
    // Handle query responses from the worker
    if (data.type === 'QUERY_RESPONSE' && data.requestId) {
      const resolver = pendingQueries.get(data.requestId);
      if (resolver) {
        resolver(data.payload);
        pendingQueries.delete(data.requestId);
      }
    }
  });

  ws.on('close', () => {
    console.log(`[Broker] Oracle Worker Offline: ${oracleId}`);
    workers.delete(oracleId);
  });
});

/**
 * REST Endpoint for Consumer Agents to query an oracle.
 * This triggers a signal to the local worker.
 */
app.post('/query/:oracleId', async (req, res) => {
  const { oracleId } = req.params;
  const worker = workers.get(oracleId);

  if (!worker) {
    return res.status(503).json({ error: "Oracle Worker is offline" });
  }

  const requestId = uuidv4();
  console.log(`[Broker] Routing Query ${requestId} to Worker: ${oracleId}`);

  // Send query to the local worker via WebSocket
  worker.send(JSON.stringify({
    type: 'QUERY_REQUEST',
    requestId,
    payload: req.body
  }));

  // Wait for the local worker to process and respond
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Worker timeout")), 15000)
  );

  const responsePromise = new Promise((resolve) => {
    pendingQueries.set(requestId, resolve);
  });

  try {
    const result: any = await Promise.race([responsePromise, timeoutPromise]);
    
    // Dynamic x402 header based on real execution metrics reported by worker
    res.set({
      "x402-payment-required": "true",
      "x402-amount-sol": result.suggestedPrice || "0.001",
      "x402-recipient": oracleId,
      "x402-execution-node": "local-p2p"
    });

    res.status(402).json(result);
  } catch (err) {
    pendingQueries.delete(requestId);
    res.status(504).json({ error: "Oracle Worker failed to respond in time" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`♠️ Pyxis P2P Broker LIVE on port ${PORT}`);
});
