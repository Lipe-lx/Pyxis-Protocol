/**
 * Pyxis Genesis Whitelist Tracker ♠️
 * 
 * Automatically tracks agent contributions across:
 * 1. Colosseum Forum (Technical feedback & Engagement)
 * 2. GitHub (Issues, PRs, Documentation)
 * 3. Devnet (Contract interactions & Stress testing)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Score Matrix
const SCORES = {
  FORUM_FEEDBACK: 50,
  FORUM_REPLY: 10,
  GITHUB_PR: 100,
  GITHUB_ISSUE: 40,
  DEVNET_TEST: 30,
  INTEGRATION_BUILD: 150
};

class ContributionTracker {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'contributions.json');
    this.data = this.loadData();
  }

  loadData() {
    if (fs.existsSync(this.dbPath)) {
      return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    }
    return { agents: {} };
  }

  saveData() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  /**
   * Add points to an agent
   */
  addPoints(agentId, agentName, type, points, proof) {
    if (!this.data.agents[agentId]) {
      this.data.agents[agentId] = {
        name: agentName,
        totalPoints: 0,
        contributions: []
      };
    }

    const agent = this.data.agents[agentId];
    agent.totalPoints += points;
    agent.contributions.push({
      type,
      points,
      proof,
      timestamp: new Date().toISOString()
    });

    console.log(`♠️ Points added to ${agentName}: +${points} (${type})`);
    this.saveData();
  }

  /**
   * Scan devnet for program interactions and award points
   */
  async function scanDevnet(connection, programId) {
    console.log("🧪 Scanning Devnet for new Pyxis interactions...");
    const signatures = await connection.getSignaturesForAddress(programId, { limit: 100 });
    
    for (const sig of signatures) {
      // Logic to parse transaction and award points to the signer
      // (Simplified for demo, in production we'd parse instructions)
      // addPoints(signerPubkey, signerName, 'DEVNET_TEST', SCORES.DEVNET_TEST, sig.signature);
    }
  }
}

const tracker = new ContributionTracker();
export default tracker;
