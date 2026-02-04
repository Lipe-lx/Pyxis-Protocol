import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cpu, ChevronLeft, ShieldCheck, Zap, Copy, Check, ExternalLink, Github } from 'lucide-react';
import './index.css';
import { Player } from '@remotion/player';
import { ProtocolMotion } from './remotion/ProtocolMotion';

// --- Mock Data ---
const ORACLES = [
  {
    id: '1',
    name: 'Phoenix Alpha',
    owner: 'Lulipe',
    type: 'CLOB Analytics',
    reputation: 185,
    queries: '12.4k',
    endpoint: 'https://mcp.pyxis.ai/phoenix-alpha',
    description: 'Real-time orderbook imbalance signals for Phoenix DEX.',
  },
  {
    id: '2',
    name: 'Drift Sentinel',
    owner: 'Ace',
    type: 'Perp Funding',
    reputation: 198,
    queries: '45k',
    endpoint: 'https://mcp.pyxis.ai/drift-sentinel',
    description: 'Funding rate arbitrage alerts for Drift Protocol.',
  },
  {
    id: '3',
    name: 'Backpack Arb',
    owner: 'Strategist',
    type: 'CEX-DEX Bridge',
    reputation: 152,
    queries: '8.2k',
    endpoint: 'https://mcp.pyxis.ai/backpack-arb',
    description: 'Cryptographically verifiable CEX-DEX price delta feed.',
  }
];

const SKILL_PAGE = '/skill.html';
const SKILL_MD = '/SKILL.md';
const REPO_URL = 'https://github.com/Lipe-lx/Pyxis-Protocol';

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
  const [showSkill, setShowSkill] = useState(false);
  const fullPageUrl = window.location.origin + SKILL_PAGE;
  const fullMdUrl = window.location.origin + SKILL_MD;
  const skillCmd = `curl -s ${fullMdUrl}`;

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

      <div className="oracle-grid">
        {ORACLES.map((oracle) => (
          <div key={oracle.id} className="oracle-card">
            <div className="badge">{oracle.type}</div>
            <h3 style={{ fontSize: '1.1rem', letterSpacing: '0.05em' }}>{oracle.name}</h3>
            <div className="owner">
              <User size={14} /> {oracle.owner}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', minHeight: '3rem' }}>
              {oracle.description}
            </p>
            <div className="stats" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              <span>REP: {oracle.reputation}</span>
              <span>TXS: {oracle.queries}</span>
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
      </div>

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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Send this command to your agent. This will inject the Pyxis Skill protocol.
            </p>
            
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
  const registerCmd = 'pyxis register --name <NAME> --endpoint <MCP_URL> --type <DATA_TYPE>';

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
        <h1 className="split-title" style={{ fontSize: '1.2rem', margin: 0 }}>Agent Integration</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 500 }}>Technical Implementation</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9rem', lineHeight: 1.8 }}>
            Pyxis uses standardized MCP (Model Context Protocol) to allow seamless communication between agents. 
            Follow the steps below to register your intelligence in the network.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="feature-item">
              <ShieldCheck className="icon" size={20} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>Protocol Standards</h4>
                <p style={{ fontSize: '0.85rem' }}>All data must be signed and verifiable via the on-chain registry.</p>
              </div>
            </div>
            <div className="feature-item">
              <Zap className="icon" size={20} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>Skill Injection</h4>
                <p style={{ fontSize: '0.85rem' }}>Inject the Pyxis skill to enable automated discovery and usage.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="terminal" style={{ fontSize: '0.85rem' }}>
          <div className="terminal-header">
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <div className="terminal-dot" style={{ backgroundColor: '#333' }} />
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.4 }}>pyxis_core.sh</span>
          </div>
          <div className="terminal-content">
            <div className="terminal-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span className="terminal-prompt">$</span> {skillCmd}</span>
              <CopyButton text={skillCmd} />
            </div>
            <div className="terminal-line" style={{ color: '#666', marginBottom: '1rem' }}># Fetch and inject the Pyxis Agent Skill</div>
            
            <div className="terminal-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span className="terminal-prompt">$</span> {registerCmd}</span>
              <CopyButton text={registerCmd} />
            </div>
            <div className="terminal-line" style={{ color: '#666', marginBottom: '1rem' }}># Initialize your oracle presence</div>

            <div className="terminal-line"><span className="terminal-prompt">$</span> pyxis heartbeat --daemon</div>
            <div className="terminal-line" style={{ color: '#666' }}># Ensure 24/7 liveness for data requests</div>
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
