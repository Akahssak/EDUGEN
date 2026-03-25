import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BrainCircuit, Database, Layers, Cpu } from 'lucide-react';
import EduGenLogo from '../components/ui/EduGenLogo';
import GlowButton from '../components/ui/GlowButton';
import GlassCard from '../components/ui/GlassCard';
import { ConceptTag } from '../components/ui/ConceptTag';

const features = [
  { icon: <Database size={18} />, label: "Context-Aware RAG" },
  { icon: <Layers size={18} />, label: "Adaptive Depth" },
  { icon: <Cpu size={18} />, label: "Multi-Model AI" }
];

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-bg-void overflow-hidden selection:bg-accent-primary/30 selection:text-white grain">
      
      {/* ── Background Elements ─────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Animated Blobs */}
        <div className="blob bg-accent-primary/20 -top-24 -left-24" />
        <div className="blob bg-accent-secondary/20 bottom-1/4 -right-24" style={{ animationDelay: '-5s' }} />
        <div className="blob bg-accent-glow/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-10s' }} />
        
        {/* Perspective Grid Plane */}
        <div className="absolute inset-0 opacity-[0.03] [perspective:1000px] overflow-hidden">
          <motion.div 
            initial={{ rotateX: 60, y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[200vw] h-[200vh] border-t border-l border-white/20"
            style={{ 
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '80px 80px'
            }}
          />
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <EduGenLogo size="md" />
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Features</a>
          <a href="#docs" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Documentation</a>
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-bold text-accent-primary hover:text-accent-glow transition-colors"
          >
            Login
          </button>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 lg:pt-48">
        
        {/* Top Tagline */}
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8"
        >
            <EduGenLogo size="lg" className="mx-auto" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-7xl lg:text-8xl font-display font-extralight tracking-tight mb-6 max-w-5xl leading-[1.1]"
        >
          Learn anything. <span className="font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-glow bg-clip-text text-transparent">Deeply.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-2xl text-text-muted font-body mb-12 max-w-2xl leading-relaxed"
        >
          Your AI tutor that <span className="text-text-primary italic">thinks</span> before it teaches.
        </motion.p>

        {/* Start Learning CTA */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.6 }}
           className="mb-20"
        >
          <GlowButton onClick={() => navigate('/login')} className="group">
            Start Learning
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </GlowButton>
        </motion.div>

        {/* Feature Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-4 max-w-2xl"
        >
          {features.map((f, idx) => (
            <motion.div 
                key={f.label}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-bg-surface/40 backdrop-blur-md border border-border-subtle rounded-full text-sm font-medium text-text-primary hover:border-accent-primary/30 transition-all cursor-default"
            >
              <span className="text-accent-primary">{f.icon}</span>
              {f.label}
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-32 px-6 lg:px-24">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <GlassCard className="!p-10 space-y-4">
               <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                  <BrainCircuit size={28} />
               </div>
               <h3 className="text-xl font-bold">Deep Reasoning</h3>
               <p className="text-text-muted text-sm leading-relaxed">Agentic workflows that break down complex subjects into digestible learning trees.</p>
            </GlassCard>
            <GlassCard className="!p-10 space-y-4" delay={0.1}>
               <div className="w-12 h-12 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                  <Database size={28} />
               </div>
               <h3 className="text-xl font-bold">Vector Persistence</h3>
               <p className="text-text-muted text-sm leading-relaxed">Every document you upload becomes part of your AI's permanent specialized knowledge.</p>
            </GlassCard>
            <GlassCard className="!p-10 space-y-4" delay={0.2}>
               <div className="w-12 h-12 rounded-xl bg-accent-glow/10 flex items-center justify-center text-accent-glow">
                  <Layers size={28} />
               </div>
               <h3 className="text-xl font-bold">Interactive Canvas</h3>
               <p className="text-text-muted text-sm leading-relaxed">Draw, write, and map concepts on an infinite spatial whiteboard designed for the mind.</p>
            </GlassCard>
         </div>
      </section>

      {/* ── Documentation Section ─────────────────────────────────── */}
      <section id="docs" className="relative z-10 py-32 px-6 lg:px-24 bg-bg-surface/20">
         <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-medium mb-12">Designed for the <span className="text-accent-primary">Digital Observatory.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['RAG Flow', 'Intent Detection', 'Spatial Memory', 'Concept Index'].map(item => (
                  <div key={item} className="p-6 border border-border-subtle rounded-2xl text-[10px] font-mono uppercase tracking-widest text-text-dim hover:text-white transition-colors cursor-default">
                    {item}
                  </div>
                ))}
            </div>
         </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border-subtle bg-bg-surface/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-text-dim font-mono text-xs">
            <Sparkles size={14} className="text-accent-glow animate-pulse" />
            <span>Built with Gemini Flash + LangGraph + Tldraw</span>
          </div>
          <div className="text-text-dim text-xs font-mono">
            &copy; 2026 EduGen AI. All knowledge indexed locally.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
