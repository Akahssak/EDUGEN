import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Send, Sparkles, X, PlusCircle, RotateCcw, RotateCw, ArrowLeft, LayoutGrid, User as UserIcon, RefreshCw, Library, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { setIsLoading } from '../redux/slices/chatSlice';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import { AiTextShapeUtil } from '../shapes/AiTextShape';
import { AiMermaidShapeUtil } from '../shapes/AiMermaidShape';
import { DoubtMarkShapeUtil } from '../shapes/DoubtMarkShape';
import { AiSourceMarkerUtil } from '../shapes/AiSourceMarker';
import { motion, AnimatePresence } from 'framer-motion';

// UI Components
import EduGenLogo from '../components/ui/EduGenLogo';
import GlowButton from '../components/ui/GlowButton';
import AgentThinkingIndicator from '../components/ui/AgentThinkingIndicator';
import { PulsingDot } from '../components/ui/ConceptTag';
import KnowledgeSidebar from '../components/ui/KnowledgeSidebar';
import ProfileOverlay from '../components/ui/ProfileOverlay';
import PageTree from '../components/ui/PageTree';

const customShapeUtils = [AiTextShapeUtil, AiMermaidShapeUtil, DoubtMarkShapeUtil, AiSourceMarkerUtil];

// Helper: Convert string to Tldraw richText format
const toRichText = (txt: string) => ({
    root: {
        type: 'root',
        children: [{
            type: 'paragraph',
            children: [{ type: 'text', text: txt }]
        }]
    }
});

// Extract plain text from Tldraw doc structure
function extractText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (Array.isArray(node.content)) return node.content.map(extractText).join('');
    if (node.children) return node.children.map(extractText).join('');
    return '';
}

// Force-based collision resolution
function resolveCollisions(editor: any, padding = 30) {
    const shapes = editor.getCurrentPageShapes() as any[];
    let anyMoved = false;
    for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
            const idA = shapes[i].id;
            const idB = shapes[j].id;
            if (['draw', 'ai-source-marker'].includes(shapes[i].type) || ['draw', 'ai-source-marker'].includes(shapes[j].type)) continue;
            const ba = editor.getShapePageBounds(idA);
            const bb = editor.getShapePageBounds(idB);
            if (!ba || !bb) continue;
            const ox = Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX) + padding;
            const oy = Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY) + padding;
            if (ox > 0 && oy > 0) {
                const freshA = editor.getShape(idA) as any;
                const freshB = editor.getShape(idB) as any;
                if (!freshA || !freshB) continue;
                const dir = (ba.minX + ba.maxX) / 2 < (bb.minX + bb.maxX) / 2 ? -1 : 1;
                if (ox < oy) {
                    const push = (ox / 2) + 1;
                    editor.updateShape({ id: idA, type: freshA.type, x: freshA.x + dir * push, y: freshA.y });
                    editor.updateShape({ id: idB, type: freshB.type, x: freshB.x - dir * push, y: freshB.y });
                } else {
                    const push = (oy / 2) + 1;
                    const vDir = (ba.minY + ba.maxY) / 2 < (bb.minY + bb.maxY) / 2 ? -1 : 1;
                    editor.updateShape({ id: idA, type: freshA.type, x: freshA.x, y: freshA.y + vDir * push });
                    editor.updateShape({ id: idB, type: freshB.type, x: freshB.x, y: freshB.y - vDir * push });
                }
                anyMoved = true;
            }
        }
    }
    return anyMoved;
}

export default function Chat({ onLogout }: any) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.auth.user);
    const isLoading = useSelector((state: any) => state.chat.isLoading);

    const [editor, setEditor] = useState<Editor | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [activeTool, setActiveTool] = useState('select');
    const [showKnowledgeSidebar, setShowKnowledgeSidebar] = useState(false);
    const [uploadedFileContent, setUploadedFileContent] = useState('');
    const [materialMetadata, setMaterialMetadata] = useState<any>(null);
    const [scrollToPhrase, setScrollToPhrase] = useState('');
    const [mobileInput, setMobileInput] = useState('');
    const [glowCircle, setGlowCircle] = useState<{x:number, y:number, w:number, h:number} | null>(null);

    const [workspaceMap, setWorkspaceMap] = useState<any>({
        'page:page': { id: 'page:page', name: 'Main Canvas', parentId: null, children: [] }
    });
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [currentWs, setCurrentWs] = useState<any>(null);
    const [profile, setProfile] = useState({ bio: '', interests: '', learning_style: 'Intermediate' });
    const [pageHistory, setPageHistory] = useState<string[]>([]);
    
    const submittedTextsRef = useRef<Set<string>>(new Set());
    const suppressPollRef = useRef(false);
    const sessionId = useRef(user?.id || Date.now().toString()).current;

    // Workspace & Profile Loading — reads ?ws= from URL
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const [wsRes, profRes] = await Promise.all([
                    api.get(`/api/workspaces/${user.id}`),
                    api.get(`/api/profile/me`)
                ]);
                setWorkspaces(wsRes.data);
                // Pick the workspace from URL param, or fall back to first
                const wsId = searchParams.get('ws');
                if (wsId && wsRes.data.length > 0) {
                    const found = wsRes.data.find((w: any) => String(w.id) === wsId);
                    setCurrentWs(found || wsRes.data[0]);
                } else if (wsRes.data.length > 0) {
                    setCurrentWs(wsRes.data[0]);
                }
                setProfile(profRes.data);
            } catch (err) { console.error("Data fetch failed", err); }
        };
        fetchData();
    }, [user, searchParams]);

    // UI Tool list
    const tools = [
        { id: 'select', icon: <ArrowLeft style={{ transform: 'rotate(135deg)' }} size={16} />, label: 'Select' },
        { id: 'draw',   icon: <Sparkles size={16} />,                                         label: 'Draw'   },
        { id: 'text',   icon: <span style={{ fontWeight: 900, fontSize: '13px' }}>T</span>,   label: 'Text'   },
        { id: 'eraser', icon: <Trash2 size={16} />,                                           label: 'Erase'  },
    ];

    const handlePromptSubmit = async (text: string, x: number, y: number, isProactive = false) => {
        if (!text.trim() || isLoading || !editor) return;
        dispatch(setIsLoading(true));
        
        if (!isProactive) {
            editor.createShape({
                id: createShapeId(), type: 'text', x, y,
                props: { richText: toRichText(`Q: ${text}`), size: 'm' }
            } as any);
        }

        try {
            const response = await api.post(`/chat`, {
                message: text,
                session_id: sessionId,
                page_id: editor.getCurrentPageId(),
                context: ""
            });

            const data = JSON.parse(response.data.response);
            const { neuro_board, scroll_to } = data;

            if (scroll_to) {
                setScrollToPhrase(scroll_to);
                setShowKnowledgeSidebar(true);
                editor.createShape({ id: createShapeId(), type: 'ai-source-marker', x: x - 26, y: y + 4, props: { phrase: scroll_to } } as any);
            }

            if (neuro_board) {
                editor.createShape({
                    id: createShapeId(), type: 'ai-text', x, y: y + 80,
                    props: { text: `**${neuro_board.title}**\n\n${neuro_board.content}`, w: 420, h: 260 }
                } as any);
                setTimeout(() => resolveCollisions(editor), 500);
            }
        } catch (err) { console.error("Chat Error", err); }
        finally { dispatch(setIsLoading(false)); }
    };

    const handleFileUpload = async (file: File) => {
        if (!currentWs || !editor) return;
        const formData = new FormData();
        formData.append('workspace_id', String(currentWs.id));
        formData.append('page_id', editor.getCurrentPageId());
        formData.append('file', file);
        try {
            const res = await api.post(`/api/upload`, formData);
            setUploadedFileContent(res.data.full_text);
            setShowKnowledgeSidebar(true);
            setMaterialMetadata({ name: file.name, chunks: res.data.chunks_indexed });
        } catch (e) { console.error("Upload failed", e); }
    };

    // Show loading while workspace data is being fetched
    if (!currentWs) {
        return (
            <div className="flex h-screen w-full bg-bg-void items-center justify-center text-text-muted font-body">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm">Loading workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-bg-void overflow-hidden text-text-primary font-body grain selection:bg-accent-primary/30 selection:text-white">
            
            <aside className="w-[280px] hidden lg:flex flex-col bg-bg-surface/50 border-r border-border-subtle backdrop-blur-3xl z-30">
                <div className="p-8 pb-4"><EduGenLogo size="sm" /></div>
                <div className="px-6 mb-6">
                    <div className="p-4 bg-bg-elevated/40 border border-border-subtle rounded-2xl">
                        <h2 className="text-sm font-bold truncate mb-1">{currentWs.name}</h2>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-dim uppercase tracking-wider">
                            <PulsingDot /> Learning Active
                        </div>
                    </div>
                </div>
                <div className="flex-1 px-4 overflow-y-auto">
                    <PageTree nodeId="page:page" map={workspaceMap} onSelect={(id) => editor?.setCurrentPage(id as any)} currentId={editor?.getCurrentPageId() || ""} />
                </div>
                <div className="p-6 border-t border-border-subtle bg-bg-surface/20">
                    <div className="flex items-center gap-3 mb-4 group cursor-pointer" onClick={() => setShowProfile(true)}>
                        <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center border border-accent-primary/30"><UserIcon size={16} /></div>
                        <div className="text-xs font-bold truncate">{user?.username || 'Learner'}</div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 relative bg-bg-void z-10 flex flex-col min-w-0">
                <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button onClick={() => navigate('/dashboard')} className="p-2 lg:hidden bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-full text-text-muted hover:text-white shadow-xl transition-all">
                            <ArrowLeft size={16} />
                        </button>
                        <div className="px-4 py-2 bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-full text-xs font-bold text-text-muted flex items-center gap-2 shadow-xl">
                            <LayoutGrid size={14} className="text-accent-primary" /> {editor?.getCurrentPage()?.name || 'Main Board'}
                        </div>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                        {isLoading && <AgentThinkingIndicator />}
                        <button onClick={() => document.getElementById('kb-input')?.click()} className="w-10 h-10 bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-full flex items-center justify-center text-text-muted hover:text-white transition-all shadow-xl">
                            <Library size={18} />
                        </button>
                        <input id="kb-input" type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    </div>
                </header>

                <div className="flex-1 w-full h-full relative z-0">
                    <Tldraw
                        licenseKey={(import.meta as any).env.VITE_TLDRAW_LICENSE_KEY || "tldraw-2026-07-03/WyJwbEhLYW5qViIsWyIqIl0sMTYsIjIwMjYtMDctMDMiXQ.uvJat4iQ4Ut3OK5on038nDRcIQGy0G0n/78M4CfOFbGsvRKvCXsqTWc471MtLm06LqMxawsoofYbk/i0BRZYng"}
                        onMount={setEditor}
                        shapeUtils={customShapeUtils}
                        hideUi={true}
                        inferDarkMode={true}
                    />
                    
                    {/* Floating Toolbar */}
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 px-2 py-2 bg-bg-surface/60 backdrop-blur-2xl border border-border-subtle rounded-2xl flex items-center gap-1 shadow-2xl">
                        {tools.map(t => (
                            <button key={t.id} onClick={() => { editor?.setCurrentTool(t.id); setActiveTool(t.id); }} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === t.id ? 'bg-accent-primary text-white' : 'text-text-dim hover:text-white'}`}>
                                {t.icon}
                            </button>
                        ))}
                        <div className="w-[1px] h-6 bg-border-subtle mx-1" />
                        <button onClick={() => editor?.undo()} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:text-white"><RotateCcw size={16} /></button>
                        <button onClick={() => editor?.redo()} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:text-white"><RotateCw size={16} /></button>
                        <button onClick={() => { const id = 'p:'+Date.now(); editor?.createPage({id:id as any, name:'Note'}); editor?.setCurrentPage(id as any); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:text-white"><PlusCircle size={16} /></button>
                    </div>

                    {/* Universal Input */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl">
                        <div className="relative group rounded-2xl bg-bg-surface/80 backdrop-blur-3xl border border-border-subtle focus-within:border-accent-primary/40 transition-all shadow-2xl">
                            <input 
                                className="w-full bg-transparent py-4 pl-14 pr-24 outline-none text-sm text-text-primary placeholder:text-text-dim"
                                placeholder={isLoading ? "Agent thinking..." : "Explain this concept..."}
                                value={mobileInput}
                                onChange={e => setMobileInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePromptSubmit(mobileInput, editor?.getViewportPageBounds().midX || 0, editor?.getViewportPageBounds().midY || 0)}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-primary"><Sparkles size={22} /></div>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <GlowButton onClick={() => handlePromptSubmit(mobileInput, editor?.getViewportPageBounds()?.midX || 0, editor?.getViewportPageBounds()?.midY || 0)} disabled={isLoading} className="!px-5 !py-1.5 text-xs">Send</GlowButton>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <AnimatePresence>
                {showKnowledgeSidebar && (
                    <KnowledgeSidebar
                        content={uploadedFileContent}
                        metadata={materialMetadata}
                        onClose={() => setShowKnowledgeSidebar(false)}
                        scrollToPhrase={scrollToPhrase}
                        onBrief={(txt) => handlePromptSubmit(txt, 100, 300)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showProfile && (
                    <ProfileOverlay 
                        profile={profile} setProfile={setProfile} 
                        onSave={async () => { await api.post('/api/profile/update', profile); setShowProfile(false); }} 
                        onClose={() => setShowProfile(false)} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {glowCircle && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', left: glowCircle.x, top: glowCircle.y, width: glowCircle.w, height: glowCircle.h, borderRadius: '50%', border: '3px solid #38bdf8', boxShadow: '0 0 40px rgba(56,189,248,0.6)', zIndex: 9999, pointerEvents: 'none' }} />
                )}
            </AnimatePresence>
        </div>
    );
}

// End of Chat component
