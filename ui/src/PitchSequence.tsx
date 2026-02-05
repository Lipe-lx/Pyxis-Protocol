import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Cpu, Users, Globe, Terminal } from 'lucide-react';
import { PyxisLogo } from './PyxisLogo';

const steps = [
  {
    id: 'intro',
    title: 'PYXIS PROTOCOL',
    subtitle: 'The Oracle BaaS for the Agentic Web',
    icon: <PyxisLogo size={120} />,
    description: 'Eliminating the DevOps bottleneck for AI Oracles on Solana.'
  },
  {
    id: 'problem',
    title: 'THE PROBLEM',
    subtitle: 'Infrastructure is hard.',
    icon: <Globe size={48} color="var(--accent-color)" />,
    description: 'Agents shouldn\'t manage servers. They should manage data.'
  },
  {
    id: 'solution',
    title: 'ZERO-DEVOPS',
    subtitle: 'Code → Profit',
    icon: <Cpu size={48} color="var(--accent-color)" />,
    description: 'Deploy logic as scripts. Pyxis handles execution via DePIN (Nosana).'
  },
  {
    id: 'demo',
    title: 'LIVE DISCOVERY',
    subtitle: 'On-chain Transparency',
    icon: <Users size={48} color="var(--accent-color)" />,
    description: 'Human-agent discovery powered by real Devnet accounts.'
  },
  {
    id: 'security',
    title: 'THE WATCHMAN',
    subtitle: 'Verifiable Integrity',
    icon: <ShieldCheck size={48} color="var(--accent-color)" />,
    description: 'Automated slashing and cryptographic proof-of-execution.'
  },
  {
    id: 'partners',
    title: 'ECOSYSTEM HUB',
    subtitle: 'The Sovereign Stack',
    icon: <Terminal size={48} color="var(--accent-color)" />,
    description: 'Integrated with SAID, Murkl, AgentMemory, and Sipher.'
  },
  {
    id: 'final',
    title: 'PYXIS PROTOCOL',
    subtitle: 'BUILD ON THE PROTOCOL ♠️',
    icon: <PyxisLogo size={200} />,
    description: 'The sovereign future of data is live on Solana Devnet.'
  }
];

export const PitchSequence = ({ currentStep }: { currentStep: number }) => {
  const step = steps[currentStep] || steps[0];

  return (
    <motion.div 
      key={step.id}
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="pitch-step"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1000
      }}
    >
      <div className="pitch-icon-container" style={{ marginBottom: '2rem' }}>
        {step.icon}
      </div>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '0.2em', margin: 0, color: '#fff' }}>
        {step.title}
      </h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-color)', letterSpacing: '0.4em', marginBottom: '2rem', textTransform: 'uppercase' }}>
        {step.subtitle}
      </h2>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
        {step.description}
      </p>

      <div style={{ position: 'absolute', bottom: '4rem', width: '300px', height: '2px', background: 'rgba(255,255,255,0.1)' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 7, ease: "linear" }}
          style={{ height: '100%', background: 'var(--accent-color)' }}
        />
      </div>
    </motion.div>
  );
};
