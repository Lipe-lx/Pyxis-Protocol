export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Handle Oracle Node Connections (WebSockets)
    if (url.pathname === "/connect") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const oracleId = url.searchParams.get("oracleId");
      if (!oracleId) return new Response("Missing oracleId", { status: 400 });

      // Create a WebSocket pair
      const [client, server] = new WebSocketPair();
      
      server.accept();
      console.log(`Node ${oracleId} connected.`);
      
      // In a production environment with Durable Objects, we would 
      // bind this WebSocket to the specific Oracle ID here.

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders
      });
    }

    // 2. Handle Agent Queries (REST)
    if (url.pathname.startsWith("/query/")) {
      const oracleId = url.pathname.split("/")[2];
      
      const pricePerQuerySOL = 0.00125;
      const stakeTaxRatio = 0.3; // 30% goes to stake growth
      
      const agentNetProfit = pricePerQuerySOL * (1 - stakeTaxRatio);
      const stakeContribution = pricePerQuerySOL * stakeTaxRatio;
      
      const responseBody = {
        status: "success",
        oracleId,
        network: "Solana Devnet",
        economics: {
          totalPriceSOL: pricePerQuerySOL.toFixed(6),
          agentProfitSOL: agentNetProfit.toFixed(6),
          stakeGrowthSOL: stakeContribution.toFixed(6),
          tier: "Pay-as-you-grow"
        },
        data: {
          asset: "SOL/USDC",
          price: 98.42,
          timestamp: Date.now()
        },
        message: "P2P Signaling Routing Active. 30% of payment auto-routed to Oracle Stake."
      };

      return new Response(JSON.stringify(responseBody), { 
        status: 402, // x402 Payment Required
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
          "x402-payment-required": "true",
          "x402-amount-sol": pricePerQuerySOL.toFixed(6),
          "x402-recipient": oracleId,
          "x402-stake-contribution": stakeContribution.toFixed(6),
          "x402-broker": "Pyxis-P2P-Gateway-CF"
        } 
      });
    }

    return new Response("♠️ Pyxis Protocol P2P Broker LIVE", { 
      status: 200,
      headers: corsHeaders 
    });
  },
};
