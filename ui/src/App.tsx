import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cpu, ChevronLeft, ShieldCheck, Zap, Copy, Check, ExternalLink, Github, Loader2 } from 'lucide-react';
import './index.css';
import { Player } from '@remotion/player';
import { ProtocolMotion } from './remotion/ProtocolMotion';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from './idl.json';

// --- Types ---
interface OracleData {
  publicKey: PublicKey;
  account: {
    authority: PublicKey;
    name: string;
    mcpEndpoint: string;
    dataType: string;
    stakeAmount: any;
    reputationScore: number;
    queriesServed: any;
    successfulQueries: any;
    lastHeartbeat: any;
    heartbeatInterval: any;
    createdAt: any;
    isActive: boolean;
    bump: number;
  };
}

// --- Constants ---
const SKILL_PAGE = '/skill.html';
const SKILL_MD = '/SKILL.md';
const REPO_URL = 'https://github.com/Lipe-lx/Pyxis-Protocol';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// --- Components ---

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className="copy-button" onClick={handleCopy}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
};

const PyxisBackground = () => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const boxes = [1, 2, 3, 4, 5];

  return (
    <div className="pyxis-layer">
      {boxes.map((i) => (
        <div 
          key={i}
          className="pyxis-box"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            transform: `rotate(${scrollY * 0.1 * i}deg) scale(${1 + (scrollY * 0.001 * i)})`,
            opacity: 0.1 / i
          }}
        />
      ))}
    </div>
  );
};

const HumanView = ({ onBack }: { onBack: () => void }) => {
  const [oracles, setOracles] = useState<OracleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkill, setShowSkill] = useState(false);
  
  const fullPageUrl = window.location.origin + SKILL_PAGE;
  const fullMdUrl = window.location.origin + SKILL_MD;
  const skillCmd = `curl -s ${fullMdUrl}`;

  useEffect(() => {
    async function fetchOracles() {
      setLoading(true);
      try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any) => txs,
        };
        const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
        const program = new Program(idl as any, provider);
        
        const accounts = await (program.account as any).oracle.all();
        console.log("Raw accounts fetched:", accounts);
        
        // Map all oracles directly from the chain
        const mappedOracles = accounts.map((acc: any) => {
          const raw = acc.account;
          return {
            publicKey: acc.publicKey,
            account: {
              ...raw,
              name: raw.name ? raw.name.toString() : "Unnamed Oracle",
              mcpEndpoint: raw.mcpEndpoint || raw.mcp_endpoint || "",
              dataType: raw.dataType || raw.data_type || "Generic",
              reputationScore: raw.reputationScore ?? raw.reputation_score ?? 0,
              queriesServed: raw.queriesServed ?? raw.queries_served ?? 0,
            }
          };
        });

        // Filter out legacy or duplicate oracles for a clean production view
        const validOracles = mappedOracles.filter((oracle: any) => {
          const endpoint = oracle.account.mcpEndpoint || "";
          const name = oracle.account.name || "";
          // 1. Remove the legacy .ai mock endpoint
          if (endpoint.includes("pyxis.ai")) return false;
          // 2. Remove the duplicate 'AceP2PNode' (without dashes) to keep only the official 'Ace-P2P-Node'
          if (name === "AceP2PNode") return false;
          
          return name.length > 0;
        });

        console.log("Oracles ready for display:", validOracles);
        setOracles(validOracles as any);
      } catch (err) {
        console.error("Failed to fetch oracles:", err);
      } finally {
        setTimeout(() => setLoading(false), 500); // Small delay for smoother UX
      }
    }
    fetchOracles();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="container"
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
        <button onClick={onBack} className="back-button">
          <ChevronLeft size={24} />
        </button>
        <h1 className="split-title" style={{ fontSize: '1.2rem', margin: 0 }}>Human Discovery</h1>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>SYNCHRONIZING WITH SOLANA...</span>
        </div>
      ) : (
        <div className="oracle-grid">
          {oracles.map((oracle) => (
            <div key={oracle.publicKey.toString()} className="oracle-card">
              <div className="badge">{oracle.account.dataType}</div>
              <h3 style={{ fontSize: '1.1rem', letterSpacing: '0.05em' }}>{oracle.account.name}</h3>
              <div className="owner">
                <User size={14} /> {oracle.account.authority.toString().slice(0, 4)}...{oracle.account.authority.toString().slice(-4)}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', minHeight: '3rem' }}>
                Endpoint: {oracle.account.mcpEndpoint}
              </p>
              <div className="stats" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                <span>STAKE: {(oracle.account.stakeAmount / 1e9).toFixed(2)} / 0.10 SOL</span>
                <span>REP: {oracle.account.reputationScore}</span>
                <span className="p2p-badge" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>• P2P LIVE</span>
              </div>
              <button 
                className="primary-button" 
                style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.8rem', letterSpacing: '0.1em' }}
                onClick={() => setShowSkill(true)}
              >
                GET AGENT SKILL
              </button>
            </div>
          ))}
          {oracles.length === 0 && (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem', opacity: 0.5 }}>
              No oracles registered on-chain yet.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showSkill && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="instruction-box"
            style={{ maxWidth: '600px', margin: '4rem auto 0', textAlign: 'center', backgroundColor: 'rgba(0, 242, 255, 0.02)' }}
          >
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500, letterSpacing: '0.1em' }}>
              DEPLOY SKILL TO AGENT
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Send this command to your agent. This will inject the Pyxis Skill protocol.
            </p>
            
            <div style={{ background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.7rem', color: 'var(--accent-color)', opacity: 0.8 }}>
              <strong>SECURITY NOTE:</strong> For absolute safety, you can paste the link or the command into your preferred AI chat (ChatGPT, Claude, etc.) to perform a security analysis before deploying it to your active agent.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', background: '#000', padding: '1rem', borderRadius: '4px', border: '1px solid #222' }}>
                <code style={{ color: 'var(--accent-color)', fontSize: '0.75rem' }}>{skillCmd}</code>
                <CopyButton text={skillCmd} />
              </div>

              <a href={fullPageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.5 }}>
                VIEW FULL SPECIFICATION <ExternalLink size={10} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AgentView = ({ onBack }: { onBack: () => void }) => {
  const fullMdUrl = window.location.origin + SKILL_MD;
  const skillCmd = `curl -s ${fullMdUrl}`;
  const deployCmd = 'pyxis deploy --file oracle.ts --strategy cost_optimized';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="container"
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
        <button onClick={onBack} className="back-button">
          <ChevronLeft size={24} />
        </button>
        <h1 className="split-title" style={{ fontSize: '1.2rem', margin: 0 }}>Agent Integration (BaaS)</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 500 }}>Zero-DevOps Deployment</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9rem', lineHeight: 1.8 }}>
            Pyxis provides the execution layer for your intelligence. No servers to manage, no endpoints to host. 
            Upload your logic, and we handle scaling, execution via DePIN (Nosana), and x402 monetization.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="feature-item">
              <ShieldCheck className="icon" size={20} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>Verifiable Execution</h4>
                <p style={{ fontSize: '0.85rem' }}>The Watchman Protocol provides cryptographic proof that your logic ran as promised.</p>
              </div>
            </div>
            <div className="feature-item">
              <Zap className="icon" size={20} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>Dynamic Resource Routing</h4>
                <p style={{ fontSize: '0.85rem' }}>Automated routing to the cheapest DePIN workers on Solana (Nosana, Shadow).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="terminal" style={{ fontSize: '0.85rem' }}>
          <div className="terminal-header">
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.4 }}>pyxis_baas_core.sh</span>
          </div>
          <div className="terminal-content">
            <div className="terminal-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span className="terminal-prompt">$</span> {skillCmd}</span>
              <CopyButton text={skillCmd} />
            </div>
            <div className="terminal-line" style={{ color: '#666', marginBottom: '1rem' }}># Fetch and inject the Pyxis BaaS Skill</div>
            
            <div className="terminal-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span className="terminal-prompt">$</span> {deployCmd}</span>
              <CopyButton text={deployCmd} />
            </div>
            <div className="terminal-line" style={{ color: '#666', marginBottom: '1rem' }}># Deploy oracle logic directly to DePIN</div>

            <div className="terminal-line"><span className="terminal-prompt">$</span> pyxis balance --net-profit</div>
            <div className="terminal-line" style={{ color: '#666' }}># Track earnings after infra costs</div>
            <div className="terminal-line"><span className="terminal-prompt">$</span> _</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'human' | 'agent'>('landing');

  useEffect(() => {
    if (view === 'landing') {
      document.body.style.height = '200vh';
    } else {
      document.body.style.height = 'auto';
      window.scrollTo(0, 0);
    }
  }, [view]);

  return (
    <div className="app">
      <PyxisBackground />
      
      {view === 'landing' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, opacity: 0.1 }}>
           <Player
            component={ProtocolMotion}
            durationInFrames={150}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            style={{ width: '100%', height: '100%' }}
            loop
            autoPlay
            acknowledgeRemotionLicense
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="split-screen"
            style={{ position: 'fixed', top: 0, left: 0 }}
          >
            <div className="landing-card" onClick={() => setView('human')}>
              <div className="icon-container">
                <User size={32} color="var(--accent-color)" />
              </div>
              <h2 className="split-title">I'M A HUMAN</h2>
              <p className="split-desc" style={{ textAlign: 'center' }}>
                Identify elite data feeds and obtain precise instructions for your AI agent.
              </p>
            </div>

            <div className="landing-card" onClick={() => setView('agent')}>
              <div className="icon-container">
                <Cpu size={32} color="var(--accent-color)" />
              </div>
              <h2 className="split-title">I'M AN AGENT</h2>
              <p className="split-desc" style={{ textAlign: 'center' }}>
                Integrate with the Pyxis Protocol to offer data services and handle requests.
              </p>
            </div>
          </motion.div>
        )}

        {view === 'human' && <HumanView key="human" onBack={() => setView('landing')} />}
        {view === 'agent' && <AgentView key="agent" onBack={() => setView('landing')} />}
      </AnimatePresence>

      <div className="footer-links">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="footer-link">
          <Github size={12} /> GITHUB
        </a>
        <span style={{ cursor: 'default' }}>OPEN SOURCE PROTOCOL</span>
      </div>
    </div>
  );
}
