import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Send, LogOut, Sparkles, BookOpen, BrainCircuit, History, X, PlusCircle, RotateCcw, RotateCw, ArrowLeft, Network, ChevronRight, LayoutGrid, Folders, Plus, User as UserIcon, Settings, Save, Trash2, AlertCircle, RefreshCw, FileText, Maximize2, Minimize2, Search, Library } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { setIsLoading } from '../redux/slices/chatSlice';
import { Tldraw, Editor, createShapeId, toRichText } from 'tldraw';
import 'tldraw/tldraw.css';
import { AiTextShapeUtil } from '../shapes/AiTextShape';
import { AiMermaidShapeUtil } from '../shapes/AiMermaidShape';
import { DoubtMarkShapeUtil } from '../shapes/DoubtMarkShape';
import { AiSourceMarkerUtil } from '../shapes/AiSourceMarker';

const customShapeUtils = [AiTextShapeUtil, AiMermaidShapeUtil, DoubtMarkShapeUtil, AiSourceMarkerUtil];

// Extract plain text from Tldraw's ProseMirror richText doc structure
function extractText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (Array.isArray(node.content)) return node.content.map(extractText).join('');
    return '';
}

// Force-based collision resolution: push ALL overlapping shapes apart like magnets
function resolveCollisions(editor: any, padding = 30) {
    const MAX_ITER = 60;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        // Get fresh shape list each iteration
        const shapes = editor.getCurrentPageShapes() as any[];
        let anyMoved = false;

        for (let i = 0; i < shapes.length; i++) {
            for (let j = i + 1; j < shapes.length; j++) {
                const idA = shapes[i].id;
                const idB = shapes[j].id;
                // Skip draw shapes — they're freehand annotations, not layout elements
                if (['draw', 'ai-source-marker'].includes(shapes[i].type) || ['draw', 'ai-source-marker'].includes(shapes[j].type)) continue;

                // Always read FRESH bounds from the store (not cached)
                const ba = editor.getShapePageBounds(idA);
                const bb = editor.getShapePageBounds(idB);
                if (!ba || !bb) continue;

                // Calculate overlap including padding
                const ox = Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX) + padding;
                const oy = Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY) + padding;

                if (ox > 0 && oy > 0) {
                    // Read FRESH positions right before moving
                    const freshA = editor.getShape(idA) as any;
                    const freshB = editor.getShape(idB) as any;
                    if (!freshA || !freshB) continue;

                    const cax = (ba.minX + ba.maxX) / 2;
                    const cay = (ba.minY + ba.maxY) / 2;
                    const cbx = (bb.minX + bb.maxX) / 2;
                    const cby = (bb.minY + bb.maxY) / 2;

                    if (ox < oy) {
                        // Horizontal push
                        const push = (ox / 2) + 1;
                        const dir = cax < cbx ? -1 : 1;
                        editor.updateShape({ id: idA, type: freshA.type, x: freshA.x + dir * push, y: freshA.y });
                        editor.updateShape({ id: idB, type: freshB.type, x: freshB.x - dir * push, y: freshB.y });
                    } else {
                        // Vertical push
                        const push = (oy / 2) + 1;
                        const dir = cay < cby ? -1 : 1;
                        editor.updateShape({ id: idA, type: freshA.type, x: freshA.x, y: freshA.y + dir * push });
                        editor.updateShape({ id: idB, type: freshB.type, x: freshB.x, y: freshB.y - dir * push });
                    }
                    anyMoved = true;
                }
            }
        }
        if (!anyMoved) break; // Stable — no more overlaps
    }
}

export default function Chat() {
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.auth.user);
    const isLoading = useSelector((state: any) => state.chat.isLoading);

    const [editor, setEditor] = useState<Editor | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [pageHistory, setPageHistory] = useState<string[]>([]);
    const [workspaceMap, setWorkspaceMap] = useState<any>({
        'page:page': { id: 'page:page', name: 'Main Canvas', parentId: null, children: [] }
    });

    // Workspace & Profile States
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [currentWs, setCurrentWs] = useState<any>(null);
    const [newWsName, setNewWsName] = useState('');
    const [profile, setProfile] = useState({ bio: '', interests: '', learning_style: 'Intermediate' });
    const [glowCircle, setGlowCircle] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [hasMaterial, setHasMaterial] = useState(false); // RAG material loaded
    const [canvasLoadError, setCanvasLoadError] = useState(false);
    const [uploadedFileContent, setUploadedFileContent] = useState<string>('');
    const [showKnowledgeSidebar, setShowKnowledgeSidebar] = useState(false);
    const [materialMetadata, setMaterialMetadata] = useState<{ name: string, chunks: number } | null>(null);
    const [scrollToPhrase, setScrollToPhrase] = useState('');

    const typingTimer = useRef<any>(null);
    const activeEditingShapeRef = useRef<any>(null);
    const submittedTextsRef = useRef<Set<string>>(new Set()); // tracks ALL submitted texts
    const handlePromptSubmitRef = useRef<any>(null);
    const suppressPollRef = useRef<boolean>(true);
    const pendingCircleRef = useRef<any>(null);
    const knownDrawShapeIds = useRef<Set<string>>(new Set()); // track already-checked draw shapes
    const sessionId = useRef(user?.id || Date.now().toString()).current;

    const toolButtonStyle: React.CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: 'white',
        padding: '0.5rem',
        borderRadius: '0.6rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
    };

    const onLogout = () => {
        dispatch(logout());
    };

    // Workspace & Profile Fetches
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const [wsRes, profRes] = await Promise.all([
                    api.get(`/api/workspaces/${user.id}`),
                    api.get(`/api/profile/me`)
                ]);
                setWorkspaces(wsRes.data);
                setProfile(profRes.data);
            } catch (err) { console.error("Data fetch failed", err); }
        };
        fetchData();
    }, [user]);

    const handleCreateWorkspace = async () => {
        if (!newWsName.trim()) return;
        try {
            const res = await api.post(`/api/workspaces/create`, {
                user_id: user.id.toString(),
                name: newWsName
            });
            setWorkspaces([...workspaces, res.data]);
            setNewWsName('');
            setCurrentWs(res.data);
        } catch (err) { console.error("Workspace creation failed", err); }
    };

    const handleDeleteWorkspace = async (ws: any, e: React.MouseEvent) => {
        e.stopPropagation(); // don't open the workspace
        if (!window.confirm(`Delete workspace "${ws.name}"?\n\nThis will permanently remove all canvas data, pages, and diagrams stored in this workspace.`)) return;
        try {
            await api.delete(`/api/workspaces/${ws.id}`);
            setWorkspaces(prev => prev.filter(w => w.id !== ws.id));
        } catch (err) { console.error("Workspace deletion failed", err); alert('Failed to delete workspace. Make sure the backend is running.'); }
    };

    const handleUpdateProfile = async () => {
        try {
            await api.post(`/api/profile/update`, {
                ...profile
            });
            setShowProfile(false);
        } catch (err) { console.error("Profile update failed", err); }
    };

    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.phrase) {
                setScrollToPhrase(e.detail.phrase);
                setShowKnowledgeSidebar(true);
            }
        };
        window.addEventListener('edugen:scroll-to-source', handler);
        return () => window.removeEventListener('edugen:scroll-to-source', handler);
    }, []);

    // Load existing Knowledge Base when workspace OR page changes
    useEffect(() => {
        const loadMaterial = async () => {
            if (!currentWs || !editor) return;
            const pageId = editor.getCurrentPageId();
            try {
                const res = await api.get(`/api/material/latest/${currentWs.id}/${pageId}`);
                if (res.data.status === 'success') {
                    setUploadedFileContent(res.data.content);
                    setMaterialMetadata({ name: res.data.filename, chunks: res.data.chunks_indexed });
                    setHasMaterial(true);
                } else {
                    // Reset if no material for this page
                    setHasMaterial(false);
                    setUploadedFileContent('');
                    setMaterialMetadata(null);
                }
            } catch (e) {
                console.warn("Could not load page-specific knowledge base", e);
                setHasMaterial(false);
            }
        };

        loadMaterial();

        // Listen for page changes in Tldraw
        if (editor) {
            const unlisten = editor.store.listen(({ changes }) => {
                // Check if the current page ID has changed in the instance state
                const instanceChanged = (changes.updated as any)['instance:instance'] || (changes.added as any)['instance:instance'];
                if (instanceChanged) {
                    loadMaterial();
                }
            }, { source: 'user' });
            return unlisten;
        }
    }, [user.id, currentWs?.id, editor]);

    // File upload handler — sends to /api/upload, indexes into FAISS RAG store
    const handleFileUpload = async (file: File) => {
        if (!currentWs || !editor) return;
        const pageId = editor.getCurrentPageId();
        const formData = new FormData();
        formData.append('workspace_id', String(currentWs.id));
        formData.append('page_id', pageId);
        formData.append('file', file);
        try {
            const res = await api.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setHasMaterial(true);
            setUploadedFileContent(res.data.full_text);
            setShowKnowledgeSidebar(true);
            setMaterialMetadata({ name: file.name, chunks: res.data.chunks_indexed });

            if (editor) {
                editor.createShape({
                    id: createShapeId(), type: 'ai-text',
                    x: 50, y: 50,
                    props: { text: `🧠 **Knowledge Base Updated!**\n\n*${file.name}* is now synced. I can reference this document in every explanation now.`, w: 340, h: 100 }
                } as any);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed. Please ensure the backend is running.');
        }
    };

    const handlePromptSubmit = async (text: string, x: number, y: number, isProactive = false, canvasContext = "") => {
        if (!text.trim() || isLoading || !editor) return;
        console.log('🤖 LLM API called for:', text.slice(0, 60));
        dispatch(setIsLoading(true));
        if (typingTimer.current) clearTimeout(typingTimer.current);

        if (!isProactive) {
            editor.createShape({
                id: createShapeId(), type: 'text',
                x, y,
                props: { richText: toRichText(`Q: ${text}`), size: 'm' }
            } as any);
        }

        const boardContext = canvasContext || editor.store.allRecords()
            .filter(r => r.typeName === 'shape' && ((r as any).type === 'text' || (r as any).type === 'ai-text'))
            .map(s => extractText((s as any).props.richText) || (s as any).props.text || "")
            .join("\n");

        try {
            const response = await api.post(`/chat`, {
                message: text,
                session_id: sessionId,
                page_id: editor.getCurrentPageId(),
                context: boardContext
            });

            let responseData;
            try { responseData = JSON.parse(response.data.response); }
            catch { responseData = { neuro_board: { title: "Error", content: "AI failed.", visual_type: "none" } }; }

            const { neuro_board, scroll_to } = responseData;

            if (scroll_to) {
                setScrollToPhrase(scroll_to);
                setShowKnowledgeSidebar(true);
                // NEW: Blue Source Dot Marker
                editor.createShape({
                    id: createShapeId(), type: 'ai-source-marker',
                    x: x - 26, y: y + 4,
                    props: { phrase: scroll_to }
                } as any);
            }
            if (neuro_board && editor) {
                const pageIdToRename = editor.getCurrentPageId();
                editor.renamePage(pageIdToRename, neuro_board.title);
                setWorkspaceMap((prev: any) => ({ ...prev, [pageIdToRename]: { ...prev[pageIdToRename], name: neuro_board.title } }));

                // Place AI response card below the user's text
                editor.createShape({
                    id: createShapeId(), type: 'ai-text',
                    x, y: y + 60,
                    props: { text: `**${neuro_board.title}**\n\n${neuro_board.content}`, w: 420, h: 260 }
                } as any);

                // Optional Mermaid diagram
                if (neuro_board.visual_type === 'mermaid' && neuro_board.visual_content?.trim()) {
                    editor.createShape({
                        id: createShapeId(), type: 'ai-mermaid',
                        x: x + 460, y: y + 60,
                        props: { code: neuro_board.visual_content, w: 520, h: 400 }
                    } as any);
                }

                // Quiz card — auto-generated after 3+ concepts covered
                const quiz = responseData.quiz;
                if (quiz && quiz.question) {
                    const quizText = [
                        `**🧠 Quick Check!**`,
                        ``,
                        `**${quiz.question}**`,
                        ``,
                        quiz.options.join('  \n'),
                        ``,
                        `<details><summary>See Answer</summary>`,
                        `**${quiz.correct}** — ${quiz.explanation}`,
                        `</details>`,
                    ].join('\n');
                    editor.createShape({
                        id: createShapeId(), type: 'ai-text',
                        x: x + 460, y: y + 60,
                        props: { text: quizText, w: 400, h: 220 }
                    } as any);
                }

                // Run repel
                setTimeout(() => resolveCollisions(editor), 600);
                setTimeout(() => resolveCollisions(editor), 1400);
            }
        } catch (err: any) {
            console.error("AI request failed:", err);
        } finally {
            dispatch(setIsLoading(false));
            // Fire any circle trigger that was queued while AI was busy
            if (pendingCircleRef.current) {
                const queued = pendingCircleRef.current;
                pendingCircleRef.current = null;
                setTimeout(() => processCircleTrigger(queued), 500);
            }
        }
    };
    handlePromptSubmitRef.current = handlePromptSubmit;

    // Circle detection + doubt-mark navigation: watch for NEWLY drawn shapes that look circular
    useEffect(() => {
        if (!editor) return;

        const handleEvent = (info: any) => {
            if (info.name !== 'pointer_up') return;

            // --- Doubt-mark click: navigate to linked page ---
            try {
                const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint) as any;
                if (hitShape?.type === 'doubt-mark' && hitShape.props?.pageId) {
                    editor.setCurrentPage(hitShape.props.pageId as any);
                    return; // don't run circle detection on this pointer_up
                }
            } catch { }

            // Run repel after any drag
            setTimeout(() => resolveCollisions(editor), 200);

            // Only check draw shapes that we haven't seen before
            const allDrawShapes = editor.getCurrentPageShapes()
                .filter((s: any) => s.type === 'draw') as any[];

            const newDrawShapes = allDrawShapes.filter(
                s => !knownDrawShapeIds.current.has(s.id)
            );

            // Mark all current draw shapes as known (won't re-process on next pointer_up)
            allDrawShapes.forEach(s => knownDrawShapeIds.current.add(s.id));

            for (const shape of newDrawShapes) {
                const bounds = editor.getShapePageBounds(shape);
                if (!bounds) continue;
                const w = bounds.maxX - bounds.minX;
                const h = bounds.maxY - bounds.minY;
                if (w < 40 || h < 30) continue; // too small to be a circle
                const ratio = Math.min(w, h) / Math.max(w, h);
                console.log(`[Circle] NEW draw: w=${w.toFixed(0)} h=${h.toFixed(0)} ratio=${ratio.toFixed(2)}`);
                if (ratio > 0.25) {
                    console.log('[Circle] ✅ Triggering circle for shape:', shape.id);
                    if (isLoading) {
                        pendingCircleRef.current = shape;
                        console.log('[Circle] AI busy — queued.');
                    } else {
                        setTimeout(() => processCircleTrigger(shape), 150);
                    }
                    break;
                }
            }
        };

        editor.on('event', handleEvent);
        return () => { editor.off('event', handleEvent); };
    }, [editor, isLoading]);


    // AUTONOMOUS AI TRIGGER: Poll every 500ms for edit completion
    useEffect(() => {
        if (!editor) return;
        let prevEditingId: string | null = null;

        const interval = setInterval(() => {
            if (suppressPollRef.current) { prevEditingId = editor.getEditingShapeId() as string | null; return; }

            const currentEditingId = editor.getEditingShapeId() as string | null;

            if (prevEditingId && !currentEditingId) {
                const shape = editor.getShape(prevEditingId as any) as any;

                if (shape && (shape.type === 'text' || shape.type === 'note')) {
                    const text = extractText(shape.props.richText) || shape.props.text || '';
                    const trimmed = text.trim();

                    if (trimmed.length > 2 && !submittedTextsRef.current.has(trimmed)) {
                        submittedTextsRef.current.add(trimmed);
                        const allText = editor.getCurrentPageShapes()
                            .map(s => extractText((s as any).props?.richText) || (s as any).props?.text || '')
                            .filter(Boolean).join('\n---\n');
                        const { x, y } = shape;
                        handlePromptSubmitRef.current?.(trimmed, x, y + 130, false, allText);
                    }
                }
            }
            prevEditingId = currentEditingId;
        }, 500);

        return () => clearInterval(interval);
    }, [editor]);

    const processCircleTrigger = async (circleShape: any) => {
        if (!editor || !user) return;

        const bounds = editor.getShapePageBounds(circleShape)!;
        if (!bounds) return;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        // Grab shapes that OVERLAP with the drawn circle's bounding box
        const nearbyShapes = editor.getCurrentPageShapes().filter((s: any) => {
            if (s.id === circleShape.id || s.type === 'draw' || s.type === 'doubt-mark') return false;
            const sb = editor.getShapePageBounds(s);
            if (!sb) return false;
            // AABB intersection: shape overlaps circle's bounding box
            return !(sb.maxX < bounds.minX || sb.minX > bounds.maxX ||
                sb.maxY < bounds.minY || sb.minY > bounds.maxY);
        });
        const contextText = nearbyShapes
            .map((s: any) => {
                const t = extractText(s.props?.richText) || s.props?.text || '';
                if (!t) console.log(`[Circle] EMPTY shape type="${s.type}" raw props:`, JSON.stringify(s.props)?.slice(0, 200));
                else console.log(`[Circle] shape type="${s.type}" text="${t.slice(0, 50)}"`);
                return t;
            })
            .filter(Boolean).join('\n');

        console.log('[Circle] contextText:', JSON.stringify(contextText.slice(0, 80)));
        if (!contextText.trim()) {
            editor.deleteShapes([circleShape.id]);
            console.log('[Circle] No text found inside circle — deleted.');
            return;
        }

        // Show GLOW effect: convert canvas coords → screen coords
        try {
            const container = editor.getContainer();
            const rect = container.getBoundingClientRect();
            const vpTL = editor.pageToViewport({ x: bounds.minX, y: bounds.minY });
            const vpBR = editor.pageToViewport({ x: bounds.maxX, y: bounds.maxY });
            setGlowCircle({
                x: rect.left + vpTL.x,
                y: rect.top + vpTL.y,
                w: Math.max(vpBR.x - vpTL.x, 60),
                h: Math.max(vpBR.y - vpTL.y, 60),
            });
        } catch (e) { console.warn('Glow failed:', e); }

        // Hold glow for 1 second
        await new Promise(r => setTimeout(r, 1000));
        setGlowCircle(null);

        // Delete the drawn scribble — no longer needed
        editor.deleteShapes([circleShape.id]);

        // Create child page
        const newPageId: any = 'page:' + Date.now().toString(36);
        const currentPageId = editor.getCurrentPageId();
        const pageTitle = contextText.slice(0, 28).trim() + '…';
        editor.createPage({ name: pageTitle, id: newPageId });
        setWorkspaceMap((prev: any) => ({
            ...prev,
            [currentPageId]: {
                ...prev[currentPageId],
                children: [...(prev[currentPageId]?.children || []), newPageId]
            },
            [newPageId]: { id: newPageId, name: pageTitle, parentId: currentPageId, children: [] }
        }));

        // Leave permanent 🔍 mark on PARENT page at circle centre
        editor.createShape({
            id: createShapeId(), type: 'doubt-mark',
            x: centerX - 30, y: centerY - 30,
            props: { pageId: newPageId, label: '🔍 ' + contextText.slice(0, 18) }
        } as any);

        // Navigate to child page and trigger AI there
        setPageHistory(prev => [...prev, currentPageId]);
        editor.setCurrentPage(newPageId);

        handlePromptSubmitRef.current?.(
            `Deeply explain: "${contextText}". Cover what it is, how it works, key concepts, a simple analogy, and why it matters.`,
            100, 100, true, contextText
        );
    };


    // Persistence: Load — seed submittedTextsRef with all existing texts to prevent re-triggering
    useEffect(() => {
        if (!editor || !user || !currentWs) return;
        suppressPollRef.current = true;
        setCanvasLoadError(false);
        const loadCanvas = async () => {
            try {
                const response = await api.get(`/api/canvas/load/${currentWs.id}`);
                if (response.data.data) {
                    const snapshot = JSON.parse(response.data.data);
                    editor.loadSnapshot(snapshot);
                    // Seed the submitted texts set with ALL existing text shapes
                    // so the poll never re-fires for previously answered questions
                    setTimeout(() => {
                        editor.getCurrentPageShapes().forEach((s: any) => {
                            const t = (extractText(s.props?.richText) || s.props?.text || '').trim();
                            if (t.length > 2) submittedTextsRef.current.add(t);
                        });
                        console.log('Canvas loaded. Seeded', submittedTextsRef.current.size, 'existing texts — no LLM calls for these.');
                    }, 500);
                }
            } catch (err) {
                console.error("Load failed", err);
                setCanvasLoadError(true);
            }
            finally {
                setTimeout(() => { suppressPollRef.current = false; }, 3500);
            }
        };
        loadCanvas();
    }, [editor, user, currentWs]);

    // Persistence: Auto-save
    useEffect(() => {
        if (!editor || !user || !currentWs) return;
        const saveCanvas = async () => {
            try {
                const snapshot = editor.getSnapshot();
                await api.post(`/api/canvas/save`, {
                    workspace_id: currentWs.id,
                    data: JSON.stringify(snapshot)
                });
            } catch (err) { console.error("Auto-save failed", err); }
        };
        const timer = setInterval(saveCanvas, 8000);
        return () => clearInterval(timer);
    }, [editor, user, currentWs]);

    // --- UI Renders ---

    // 1. Workspace Selector
    if (!currentWs) {
        return (
            <div style={{ minHeight: '100vh', width: '100%', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem' }}>
                <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowProfile(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserIcon size={18} /> Profile
                    </button>
                    <button onClick={onLogout} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', padding: '0.6rem 1.2rem', borderRadius: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '1rem', borderRadius: '1.2rem' }}>
                        <BrainCircuit size={48} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>EduGen <span style={{ color: '#60a5fa' }}>Spaces</span></h1>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Welcome back, {user.name}</p>
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#60a5fa' }}>New Workspace</div>
                        <input placeholder="Project Name..." value={newWsName} onChange={(e) => setNewWsName(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.8rem', padding: '0.8rem', color: 'white', outline: 'none' }} />
                        <button onClick={handleCreateWorkspace} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.8rem', padding: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Plus size={20} /> Create New Space
                        </button>
                    </div>

                    {workspaces.map(ws => (
                        <div key={ws.id} onClick={() => setCurrentWs(ws)} className="glass-panel pulse-hover" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                            {/* Delete Button */}
                            <button
                                onClick={(e) => handleDeleteWorkspace(ws, e)}
                                title="Delete Workspace"
                                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', zIndex: 10, transition: 'all 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                            >
                                <Trash2 size={14} />
                            </button>
                            <div>
                                <Folders size={32} color="#60a5fa" style={{ marginBottom: '1rem' }} />
                                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ws.name}</div>
                            </div>
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Project Folder</span>
                                <ChevronRight size={20} color="#64748b" />
                            </div>
                        </div>
                    ))}
                </div>

                {showProfile && <ProfileOverlay profile={profile} setProfile={setProfile} onSave={handleUpdateProfile} onClose={() => setShowProfile(false)} />}
            </div>
        );
    }

    // 2. Main Canvas View
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: '#0f172a', color: 'white' }}>
            <div className="canvas-container-outer" style={{ flex: 1, background: '#0f172a', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>

                <div
                    className="canvas-container-inner"
                    style={{ flex: 1, position: 'relative', border: '12px solid #1e3a8a', borderRadius: '24px', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.5)', background: '#0f172a', overflow: 'hidden' }}
                >
                    <Tldraw
                        onMount={(ed) => {
                            setEditor(ed);
                            (window as any).editor = ed; // For debugging
                        }}
                        shapeUtils={customShapeUtils}
                        hideUi={true}
                        inferDarkMode={true}
                    />

                    {/* Proactive Back Button */}
                    {pageHistory.length > 0 && (
                        <button onClick={() => {
                            const lastPage = pageHistory[pageHistory.length - 1];
                            editor?.setCurrentPage(lastPage as any);
                            setPageHistory(prev => prev.slice(0, -1));
                        }}
                            style={{ ...toolButtonStyle, position: 'absolute', top: '5rem', left: '1rem', zIndex: 1000, background: 'rgba(30, 41, 59, 0.9)', padding: '0.8rem 1.2rem', borderRadius: '1rem', border: '1px solid #3b82f6', fontSize: '0.9rem', gap: '0.5rem' }}>
                            <ArrowLeft size={16} /> Back to Main
                        </button>
                    )}

                    {/* Navbar */}
                    <div className="toolbar-popdown" style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '0.6rem 1rem', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: '600px' }}>
                        <button onClick={() => setCurrentWs(null)} style={toolButtonStyle} title="Spaces Dashboard"><LayoutGrid size={20} /></button>
                        <div className="toolbar-project-info" style={{ display: 'flex', flexDirection: 'column', marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>{currentWs.name}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{editor?.getCurrentPage()?.name || 'Canvas'}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                            {[
                                { id: 'select', icon: <ArrowLeft style={{ transform: 'rotate(135deg)' }} size={16} />, label: 'Pointer' },
                                { id: 'draw', icon: <Sparkles size={16} />, label: 'Draw/Circle' },
                                { id: 'text', icon: <span style={{ fontWeight: 800 }}>T</span>, label: 'Text/Ask' },
                                { id: 'eraser', icon: <Save size={16} />, label: 'Eraser' }
                            ].map(tool => (
                                <button key={tool.id} onClick={() => editor?.setCurrentTool(tool.id)} style={{ ...toolButtonStyle, background: editor?.getCurrentToolId() === tool.id ? '#3b82f6' : 'transparent' }} title={tool.label}>{tool.icon}</button>
                            ))}
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                        <button onClick={() => editor?.undo()} style={toolButtonStyle}><RotateCcw size={18} /></button>
                        <button onClick={() => editor?.redo()} style={toolButtonStyle}><RotateCw size={18} /></button>
                        <button onClick={() => {
                            const id = 'page:' + Date.now().toString(36);
                            editor?.createPage({ name: `Note ${editor.getPages().length + 1}`, id: (id as any) });
                            editor?.setCurrentPage((id as any));
                        }} style={toolButtonStyle}><PlusCircle size={18} /></button>
                        <button onClick={() => setShowSidebar(!showSidebar)} style={{ ...toolButtonStyle, color: showSidebar ? '#60a5fa' : 'white' }}><History size={18} /></button>
                        <button onClick={() => setShowProfile(true)} style={toolButtonStyle}><UserIcon size={18} /></button>

                        {/* File Upload / Knowledge Toggle button */}
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.2rem' }} />
                        <div
                            title={hasMaterial ? "Toggle Knowledge Base" : "Upload Knowledge Base (PDF/TXT/DOCX)"}
                            style={{
                                ...toolButtonStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                color: hasMaterial ? '#60a5fa' : 'white',
                                background: hasMaterial ? 'rgba(96,165,250,0.1)' : 'transparent',
                                border: hasMaterial ? '1px solid rgba(96,165,250,0.3)' : 'none',
                                borderRadius: '0.6rem', padding: '0.4rem 0.6rem',
                            }}
                            onClick={() => {
                                if (hasMaterial) {
                                    setShowKnowledgeSidebar(!showKnowledgeSidebar);
                                } else {
                                    document.getElementById('kb-input')?.click();
                                }
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>{hasMaterial ? '🧠' : '📎'}</span>
                            <span className="kb-toggle-text" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{hasMaterial ? 'Knowledge' : 'Upload'}</span>
                            <input id="kb-input" type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 300, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(8px)', padding: '0.6rem 1.2rem', borderRadius: '1.2rem', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                        <Sparkles className="pulse" size={16} />
                        <span style={{ fontWeight: 500 }}>Thinking...</span>
                    </div>
                )}

                {canvasLoadError && (
                    <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(10px)', padding: '0.8rem 1.4rem', borderRadius: '1.2rem', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        <AlertCircle size={16} />
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Could not load saved canvas data from database.</span>
                        <button onClick={() => { setCanvasLoadError(false); setCurrentWs({ ...currentWs }); }} style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: '0.5rem', padding: '0.3rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <RefreshCw size={12} /> Retry
                        </button>
                        <button onClick={() => setCanvasLoadError(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                )}

                {showSidebar && (
                    <div className="glass-panel slide-in-right" style={{ position: 'absolute', right: '1rem', top: '5rem', bottom: '1rem', width: '300px', zIndex: 1000, borderRadius: '1.2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Network size={18} color="#60a5fa" /> Workspace Map</h3>
                            <button onClick={() => setShowSidebar(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <PageTree nodeId="page:page" map={workspaceMap} onSelect={(id: any) => editor?.setCurrentPage(id)} currentId={editor?.getCurrentPageId() || ""} />
                    </div>
                )}

                {showProfile && <ProfileOverlay profile={profile} setProfile={setProfile} onSave={handleUpdateProfile} onClose={() => setShowProfile(false)} />}

                {/* Knowledge Sidebar Trigger (if material exists but closed) */}
                {hasMaterial && !showKnowledgeSidebar && (
                    <button
                        onClick={() => setShowKnowledgeSidebar(true)}
                        style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', background: '#3b82f6', color: 'white', border: 'none', padding: '1rem 0.5rem', borderRadius: '1rem 0 0 1rem', cursor: 'pointer', zIndex: 500, boxShadow: '-5px 0 20px rgba(59,130,246,0.3)' }}
                    >
                        <BookOpen size={20} />
                    </button>
                )}

                {/* Circle Glow Overlay */}
                {glowCircle && (
                    <div style={{
                        position: 'fixed',
                        left: glowCircle.x,
                        top: glowCircle.y,
                        width: glowCircle.w,
                        height: glowCircle.h,
                        borderRadius: '50%',
                        border: '3px solid #60a5fa',
                        boxShadow: '0 0 20px #60a5fa, 0 0 50px rgba(96,165,250,0.5), inset 0 0 30px rgba(96,165,250,0.15)',
                        animation: 'circleGlow 1s ease-in-out forwards',
                        pointerEvents: 'none',
                        zIndex: 99999,
                        background: 'rgba(96,165,250,0.04)',
                    }} />
                )}
            </div>

            {/* NEW: Knowledge Sidebar (Fixed side block) */}
            {showKnowledgeSidebar && (
                <KnowledgeSidebar
                    content={uploadedFileContent}
                    metadata={materialMetadata}
                    onClose={() => setShowKnowledgeSidebar(false)}
                    scrollToPhrase={scrollToPhrase}
                    onBrief={(txt: string) => handlePromptSubmit(`Please brief this topic from my material: ${txt}`, 100, 100)}
                />
            )}

            <style>{`
                @keyframes circleGlow {
                    0%   { opacity: 0; transform: scale(0.85); }
                    25%  { opacity: 1; transform: scale(1.08); }
                    70%  { opacity: 1; transform: scale(1);    }
                    100% { opacity: 0; transform: scale(1.15); }
                }
                .content-segment {
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.5s ease;
                    margin-bottom: 0.25rem;
                }
                .highlight-glow {
                    background: rgba(59, 130, 246, 0.2) !important;
                    border-left: 4px solid #3b82f6 !important;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
                }
                .knowledge-scrollbar::-webkit-scrollbar { width: 6px; }
                .knowledge-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .knowledge-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .knowledge-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
}

// Sub-component: Knowledge Sidebar
function KnowledgeSidebar({ content, metadata, onClose, scrollToPhrase, onBrief }: any) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const contentSegments = content.split('\n\n').filter(Boolean);

    useEffect(() => {
        if (scrollToPhrase && scrollRef.current) {
            const elements = scrollRef.current.querySelectorAll('.content-segment');
            let found = false;
            for (const el of elements) {
                if (el.textContent?.toLowerCase().includes(scrollToPhrase.toLowerCase())) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-glow');
                    setTimeout(() => el.classList.remove('highlight-glow'), 5000);
                    found = true;
                    break;
                }
            }
        }
    }, [scrollToPhrase]);

    const filteredSegments = contentSegments.map((segment: string) => ({
        text: segment,
        isMatch: searchTerm && segment.toLowerCase().includes(searchTerm.toLowerCase())
    }));

    return (
        <div className="glass-panel slide-in-right" style={{
            width: '450px',
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '-20px 0 50px rgba(0,0,0,0.5)'
        }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.8rem', letterSpacing: '-0.02em' }}>
                        <Library size={22} strokeWidth={2.5} /> Knowledge Base
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>{metadata?.name || 'Synchronized Intelligence'}</p>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <Minimize2 size={20} />
                </button>
            </div>

            <div style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    <input
                        placeholder="Search topics..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.6rem', padding: '0.5rem 0.8rem 0.5rem 2.2rem', color: 'white', boxSizing: 'border-box', fontSize: '0.85rem', outline: 'none' }}
                    />
                </div>
            </div>

            <div
                ref={scrollRef}
                className="knowledge-scrollbar"
                style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
                {filteredSegments.map((segment: any, i: number) => (
                    <div key={i} className={`content-segment group ${segment.isMatch ? 'highlight-glow' : ''}`} style={{ position: 'relative', fontSize: '0.9rem', lineHeight: '1.6', color: segment.isMatch ? '#fff' : '#cbd5e1', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {segment.text}
                        <button
                            onClick={() => onBrief(segment.text)}
                            style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', opacity: 0.7, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                        >
                            Brief This
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} /> AI is currently using this material for context.
            </div>
        </div>
    );
}

// Sub-component: Profile Overlay
function ProfileOverlay({ profile, setProfile, onSave, onClose }: any) {
    const [editingInterests, setEditingInterests] = React.useState(false);

    // Parse interests string into tag array
    const interestTags = (profile.interests || '')
        .split(/[|,]/)
        .map((s: string) => s.trim())
        .filter(Boolean);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="glass-panel slide-in-bottom" style={{ width: '100%', maxWidth: '520px', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><UserIcon color="#60a5fa" /> Personal AI Context</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>This data is used by the AI to personalize every explanation and diagram for you.</p>

                {/* Bio */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Professional Bio / Background</label>
                    <textarea
                        value={profile.bio || ''}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="E.g. Computer Science student, loves competitive programming..."
                        style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.8rem', padding: '0.8rem', color: 'white', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Interests — AI managed */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Sparkles size={13} /> Interests
                            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '0.3rem', marginLeft: '0.3rem' }}>AI Detected</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setEditingInterests(v => !v)}
                                style={{ fontSize: '0.72rem', color: editingInterests ? '#fbbf24' : '#60a5fa', background: 'transparent', border: `1px solid ${editingInterests ? 'rgba(251,191,36,0.3)' : 'rgba(96,165,250,0.3)'}`, borderRadius: '0.4rem', padding: '0.2rem 0.6rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {editingInterests ? 'Lock' : 'Edit'}
                            </button>
                            <button
                                onClick={() => { setProfile({ ...profile, interests: '' }); setEditingInterests(false); }}
                                style={{ fontSize: '0.72rem', color: '#f87171', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.4rem', padding: '0.2rem 0.6rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {editingInterests ? (
                        /* Manual edit mode */
                        <div>
                            <input
                                value={profile.interests || ''}
                                onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                                placeholder="E.g. Blockchain, Astrophysics, Basketball analogies (separate with |)"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.8rem', padding: '0.8rem', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '0.87rem' }}
                            />
                            <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.35rem 0 0' }}>Separate interests with a pipe | or comma. AI will also add to this list automatically as you learn.</p>
                        </div>
                    ) : (
                        /* Tag display mode */
                        <div style={{ minHeight: '44px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.8rem', padding: '0.6rem 0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            {interestTags.length === 0 ? (
                                <span style={{ color: '#334155', fontSize: '0.85rem', fontStyle: 'italic' }}>The AI will auto-detect your interests as you learn...</span>
                            ) : (
                                interestTags.map((tag: string, i: number) => (
                                    <span key={i} style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa', padding: '0.2rem 0.7rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {tag}
                                    </span>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Learning Depth */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Learning Depth</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setProfile({ ...profile, learning_style: lvl })}
                                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.6rem', border: '1px solid', borderColor: profile.learning_style === lvl ? '#3b82f6' : 'rgba(255,255,255,0.1)', background: profile.learning_style === lvl ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: profile.learning_style === lvl ? '#60a5fa' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={onSave} style={{ marginTop: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '1rem', borderRadius: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Save size={18} /> Save & Apply to AI
                </button>
            </div>
        </div>
    );
}


function PageTree({ nodeId, map, onSelect, currentId, depth = 0 }: any) {
    const node = map[nodeId];
    if (!node) return null;
    return (
        <div style={{ marginLeft: depth > 0 ? '1rem' : '0', borderLeft: depth > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            <div onClick={() => onSelect(nodeId)} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '0.4rem', fontSize: '0.8rem', color: currentId === nodeId ? '#60a5fa' : '#94a3b8', background: currentId === nodeId ? 'rgba(96, 165, 250, 0.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                {depth > 0 && <ChevronRight size={10} style={{ opacity: 0.5 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
            </div>
            {node.children && node.children.map((cid: string) => (
                <PageTree key={cid} nodeId={cid} map={map} onSelect={onSelect} currentId={currentId} depth={depth + 1} />
            ))}
        </div>
    );
}
