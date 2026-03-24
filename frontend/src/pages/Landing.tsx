import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Zap, BookOpen, Network, Sparkles, ArrowRight, CircleDot } from 'lucide-react';

const features = [
    {
        icon: <BrainCircuit size={28} color="#60a5fa" />,
        title: 'AI-Powered Canvas',
        desc: 'Type a concept or draw a circle around any text. EduGen AI instantly generates explanations, diagrams, and flowcharts directly on your infinite canvas.'
    },
    {
        icon: <Network size={28} color="#a78bfa" />,
        title: 'Smart Mind Maps',
        desc: 'Automatically builds connected knowledge graphs as you learn. Each concept links to sub-topics, creating a living map of your understanding.'
    },
    {
        icon: <Zap size={28} color="#fbbf24" />,
        title: 'Adaptive Quizzes',
        desc: 'After exploring 3+ concepts, the AI auto-generates a quiz to test your understanding. Learning that actually sticks.'
    },
    {
        icon: <BookOpen size={28} color="#34d399" />,
        title: 'Upload Your Material',
        desc: 'Upload PDF or TXT study material. EduGen RAG engine indexes it so the AI can teach directly from your textbooks and notes.'
    },
    {
        icon: <Sparkles size={28} color="#f472b6" />,
        title: 'Personalized by AI',
        desc: 'The AI tracks your interests and learning style automatically, tailoring every explanation and analogy specifically for you.'
    },
    {
        icon: <CircleDot size={28} color="#38bdf8" />,
        title: 'Circle to Drill Down',
        desc: 'Draw a circle around any text on the canvas. EduGen creates a new dedicated page and dives deep into that topic instantly.'
    }
];

export default function Landing() {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Animated particle background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.5,
                a: Math.random() * 0.5 + 0.1,
            });
        }

        let animId: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(96,165,250,${p.a})`;
                ctx.fill();
            });

            // Draw gentle connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(96,165,250,${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <div
            style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020818 0%, #0a0f1e 40%, #0f172a 100%)', color: 'white', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}
            onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
        >
            {/* Particle canvas */}
            <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

            {/* Mouse glow */}
            <div style={{
                position: 'fixed',
                left: mousePos.x - 200,
                top: mousePos.y - 200,
                width: 400, height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 1, transition: 'left 0.1s, top 0.1s'
            }} />

            {/* NAV */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1.2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2,8,24,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '0.5rem', borderRadius: '0.7rem' }}>
                        <BrainCircuit size={22} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>EduGen <span style={{ color: '#60a5fa' }}>AI</span></span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                        Features
                    </a>
                    <a href="#data" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                        Data & Storage
                    </a>
                    <button
                        onClick={() => navigate('/login')}
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: 'white', padding: '0.6rem 1.4rem', borderRadius: '0.65rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.3)'; }}
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <section style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '8rem 2rem 4rem' }}>
                {/* Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '2rem', padding: '0.4rem 1.1rem', fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600, marginBottom: '2.5rem', letterSpacing: '0.03em' }}>
                    <Sparkles size={14} /> Powered by Gemini + LangGraph
                </div>

                <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', margin: '0 0 1.5rem', maxWidth: '850px' }}>
                    Your AI Tutor Lives{' '}
                    <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        on the Canvas
                    </span>
                </h1>

                <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#94a3b8', maxWidth: '620px', lineHeight: 1.7, marginBottom: '3rem' }}>
                    EduGen turns your notes into interactive mind maps, diagrams, and personalized explanations in real time. Just write, draw, or circle — the AI does the rest.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={() => navigate('/login')}
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: 'white', padding: '1rem 2.2rem', borderRadius: '0.9rem', fontWeight: 800, cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.25s', boxShadow: '0 8px 30px rgba(59,130,246,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(59,130,246,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(59,130,246,0.35)'; }}
                    >
                        <Sparkles size={20} /> Start Learning Free <ArrowRight size={18} />
                    </button>
                    <a href="#features" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '1rem 2rem', borderRadius: '0.9rem', fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                        See Features
                    </a>
                </div>

                {/* Hero stats */}
                <div style={{ display: 'flex', gap: '3rem', marginTop: '5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['Infinite', 'Canvas'], ['Real-time', 'AI Diagrams'], ['100%', 'Local Data']].map(([val, label]) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>{val}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '0.2rem' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" style={{ position: 'relative', zIndex: 2, padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 1rem' }}>
                        Everything You Need to <span style={{ color: '#60a5fa' }}>Master Anything</span>
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                        Built for students, researchers, and curious minds who want to learn faster and retain more.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {features.map(f => (
                        <div key={f.title}
                            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.2rem', padding: '2rem', transition: 'all 0.3s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(96,165,250,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.8rem', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.6rem' }}>{f.title}</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* DATA STORAGE SECTION */}
            <section id="data" style={{ position: 'relative', zIndex: 2, padding: '5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '1.5rem', padding: '3rem', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(96,165,250,0.1)', borderRadius: '0.8rem', padding: '0.8rem' }}>
                            <BookOpen size={24} color="#60a5fa" />
                        </div>
                        <div>
                            <h2 style={{ fontWeight: 800, fontSize: '1.6rem', margin: 0 }}>Where Is Your Data Stored?</h2>
                            <p style={{ color: '#64748b', margin: '0.3rem 0 0', fontSize: '0.9rem' }}>100% local — nothing leaves your machine</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {[
                            {
                                label: 'SQLite Database',
                                path: 'backend/edugen.db',
                                desc: 'Stores all users, workspaces, and canvas snapshots (tldraw JSON). Viewable with any SQLite browser.',
                                color: '#34d399'
                            },
                            {
                                label: 'Vector Store (RAG)',
                                path: 'backend/vector_stores/{user_id}/',
                                desc: 'FAISS index files for uploaded PDFs and TXT files. Each user gets their own isolated folder.',
                                color: '#a78bfa'
                            },
                            {
                                label: 'Canvas Data (per workspace)',
                                path: 'SQLite → canvas_data table → data (JSON)',
                                desc: 'Full tldraw snapshot: all pages, shapes, text blocks, mermaid diagrams, and page names.',
                                color: '#fbbf24'
                            },
                            {
                                label: 'Environment & API Keys',
                                path: 'backend/.env',
                                desc: 'Google Gemini API keys are stored here. Never committed to version control.',
                                color: '#f87171'
                            }
                        ].map(item => (
                            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.9rem', padding: '1.2rem 1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '4px', minHeight: '60px', borderRadius: '2px', background: item.color, flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{item.label}</div>
                                    <code style={{ fontSize: '0.78rem', color: item.color, background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', display: 'inline-block', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>{item.path}</code>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '0.8rem', padding: '1rem 1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <Zap size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ color: '#93c5fd', fontSize: '0.87rem', margin: 0, lineHeight: 1.6 }}>
                            <strong>Admin Panel</strong> at <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>http://localhost:8002</code> — view and manage all users, workspaces, pages, and canvas data in real-time. Includes delete workspace and full data inspector.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ position: 'relative', zIndex: 2, padding: '5rem 2rem 8rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 1.2rem' }}>
                    Ready to Learn Smarter?
                </h2>
                <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1.05rem' }}>
                    No signup, no subscription. Just enter your name and start exploring.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: 'white', padding: '1.1rem 2.5rem', borderRadius: '1rem', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.7rem', transition: 'all 0.25s', boxShadow: '0 10px 35px rgba(59,130,246,0.4)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 45px rgba(59,130,246,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 35px rgba(59,130,246,0.4)'; }}
                >
                    <BrainCircuit size={22} /> Launch EduGen AI <ArrowRight size={20} />
                </button>
            </section>

            {/* Footer */}
            <footer style={{ position: 'relative', zIndex: 2, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '1.5rem', color: '#334155', fontSize: '0.82rem' }}>
                EduGen AI — Built with Gemini, LangGraph, FastAPI, React & tldraw. All data stored locally.
            </footer>
        </div>
    );
}
