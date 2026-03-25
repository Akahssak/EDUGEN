import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Send, LogOut, Sparkles, BookOpen, BrainCircuit, History, X, PlusCircle, RotateCcw, RotateCw, ArrowLeft, Network, ChevronRight, LayoutGrid, Folders, Plus, User as UserIcon, Settings, Save, Trash2, AlertCircle, RefreshCw, FileText, Maximize2, Minimize2, Search, Library } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { setIsLoading } from '../redux/slices/chatSlice';
import { Tldraw, Editor, createShapeId } from 'tldraw';
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
    const [activeTool, setActiveTool] = useState('select');
    const [mobileInput, setMobileInput] = useState('');
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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

    const getToolStyle = (toolId: string): React.CSSProperties => ({
        ...toolButtonStyle,
        background: activeTool === toolId ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.05)',
        color: activeTool === toolId ? 'white' : '#94a3b8',
        border: activeTool === toolId ? '1px solid rgba(96,165,250,0.6)' : '1px solid transparent',
        boxShadow: activeTool === toolId ? '0 0 12px rgba(59,130,246,0.4)' : 'none',
        transform: activeTool === toolId ? 'scale(1.08)' : 'scale(1)',
    });

    const setTool = (toolId: string) => {
        editor?.setCurrentTool(toolId);
        setActiveTool(toolId);
    };

    const onLogout = () => {
        dispatch(logout());
    };

    // Track window resize for mobile detection
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync active tool from editor
    useEffect(() => {
        if (!editor) return;
        const unsub = editor.store.listen(() => {
            const toolId = editor.getCurrentToolId();
            if (toolId) setActiveTool(toolId);
        }, { source: 'user' });
        return unsub;
    }, [editor]);

    // Submit from mobile text input
    const handleMobileSubmit = () => {
        const text = mobileInput.trim();
        if (!text || isLoading || !editor) return;
        const vp = editor.getViewportPageBounds();
        const x = vp.midX - 200;
        const y = vp.midY - 80;
        setMobileInput('');
        handlePromptSubmitRef.current?.(text, x, y, false, '');
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
            <div style={{ minHeight: '100dvh', width: '100%', background: 'var(--bg-0)', color: 'var(--text-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ width: '100%', maxWidth: '960px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                        <img src="/logo.png" alt="EduGen" style={{ width: '48px', height: '48px', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }} />
                        <div>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>EduGen <span style={{ color: '#60a5fa' }}>Spaces</span></h1>
                            <p style={{ color: 'var(--text-2)', margin: 0, fontSize: '0.85rem' }}>Welcome back, {user.name}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setShowProfile(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                            <UserIcon size={15} /> Profile
                        </button>
                        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                            <LogOut size={15} /> Logout
                        </button>
                    </div>
                </div>

                {/* Workspace Grid */}
                <div className="ws-grid">
                    {/* Create New */}
                    <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: 'var(--radius-lg)', border: '2px dashed rgba(96,165,250,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlusCircle size={18} /> New Workspace</div>
                        <input
                            className="input-primary"
                            placeholder="Name your workspace..."
                            value={newWsName}
                            onChange={(e) => setNewWsName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); }}
                        />
                        <button onClick={handleCreateWorkspace} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                            <Plus size={18} /> Create Space
                        </button>
                    </div>

                    {workspaces.map(ws => (
                        <div
                            key={ws.id}
                            onClick={() => setCurrentWs(ws)}
                            className="glass-panel"
                            style={{ padding: '1.8rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', transition: 'all 0.22s', minHeight: '160px' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <button
                                onClick={(e) => handleDeleteWorkspace(ws, e)}
                                title="Delete"
                                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '0.5rem', padding: '0.3rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                            >
                                <Trash2 size={13} />
                            </button>
                            <div>
                                <Folders size={28} color="#60a5fa" style={{ marginBottom: '0.9rem' }} />
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, paddingRight: '2rem' }}>{ws.name}</div>
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>Project Folder</span>
                                <ChevronRight size={18} color="var(--text-3)" />
                            </div>
                        </div>
                    ))}
                </div>

                {showProfile && <ProfileOverlay profile={profile} setProfile={setProfile} onSave={handleUpdateProfile} onClose={() => setShowProfile(false)} />}
            </div>
        );
    }

    // — Tool helpers —
    const tools = [
        { id: 'select', icon: <ArrowLeft style={{ transform: 'rotate(135deg)' }} size={16} />, label: 'Select' },
        { id: 'draw',   icon: <Sparkles size={16} />,                                         label: 'Draw'   },
        { id: 'text',   icon: <span style={{ fontWeight: 900, fontSize: '13px' }}>T</span>,   label: 'Text'   },
        { id: 'eraser', icon: <Trash2 size={16} />,                                           label: 'Erase'  },
    ];
    const addPage = () => {
        const id: any = 'page:' + Date.now().toString(36);
        editor?.createPage({ name: `Note ${editor.getPages().length + 1}`, id });
        editor?.setCurrentPage(id);
    };

    // 2. Main Canvas View
    return (
        <div style={{ display: 'flex', height: '100dvh', width: '100%', overflow: 'hidden', background: 'var(--bg-0)', color: 'var(--text-1)' }}>

            {/* ── Canvas column ─────────────────────────────────── */}
            <div className="canvas-outer">

                {/* Canvas frame */}
                <div className="canvas-inner">
                    <Tldraw
                        licenseKey={(import.meta as any).env.VITE_TLDRAW_LICENSE_KEY || ''}
                        onMount={(ed) => {
                            setEditor(ed);
                            (window as any).editor = ed;
                        }}
                        shapeUtils={customShapeUtils}
                        hideUi={true}
                        inferDarkMode={true}
                    />

                    {/* Back button (when in drilled page) */}
                    {pageHistory.length > 0 && (
                        <button
                            onClick={() => {
                                const last = pageHistory[pageHistory.length - 1];
                                editor?.setCurrentPage(last as any);
                                setPageHistory(p => p.slice(0, -1));
                            }}
                            style={{ position: 'absolute', top: '4.5rem', left: '1rem', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(10,22,40,0.88)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, backdropFilter: 'blur(12px)' }}
                        >
                            <ArrowLeft size={15} /> Back
                        </button>
                    )}

                    {/* Desktop Toolbar */}
                    <div className="toolbar toolbar-popdown">
                        {/* Logo / back to spaces */}
                        <button onClick={() => setCurrentWs(null)} className="tool-btn" title="Spaces Dashboard" style={{ width: 32, height: 32 }}>
                            <img src="/logo.png" style={{ width: '20px', height: '20px', borderRadius: '0.3rem' }} alt="" />
                        </button>

                        {/* Project info */}
                        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '0.7rem', marginRight: '0.2rem', maxWidth: '120px' }}>
                            <span style={{ fontSize: '0.62rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentWs.name}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editor?.getCurrentPage()?.name || 'Canvas'}</span>
                        </div>

                        {/* Tools */}
                        {tools.map(t => (
                            <button key={t.id} onClick={() => setTool(t.id)} className={`tool-btn${activeTool === t.id ? ' active' : ''}`} title={t.label}>{t.icon}</button>
                        ))}

                        <div className="toolbar-divider" />

                        <button onClick={() => editor?.undo()} className="tool-btn" title="Undo"><RotateCcw size={15} /></button>
                        <button onClick={() => editor?.redo()} className="tool-btn" title="Redo"><RotateCw size={15} /></button>
                        <button onClick={addPage} className="tool-btn" title="New Page"><PlusCircle size={15} /></button>

                        <div className="toolbar-divider" />

                        <button onClick={() => setShowSidebar(!showSidebar)} className={`tool-btn${showSidebar ? ' active' : ''}`} title="Workspace Map"><History size={15} /></button>
                        <button onClick={() => setShowProfile(true)} className="tool-btn" title="Profile"><UserIcon size={15} /></button>

                        {/* Knowledge toggle */}
                        <button
                            className={`tool-btn${hasMaterial ? ' active' : ''}`}
                            title={hasMaterial ? 'Toggle Knowledge Base' : 'Upload Knowledge Base'}
                            onClick={() => { if (hasMaterial) setShowKnowledgeSidebar(!showKnowledgeSidebar); else document.getElementById('kb-input')?.click(); }}
                            style={{ gap: '4px', width: 'auto', padding: '0 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                        >
                            <span style={{ fontSize: '15px' }}>{hasMaterial ? '🧠' : '📎'}</span>
                            <span>{hasMaterial ? 'KB' : 'Upload'}</span>
                        </button>
                        <input id="kb-input" type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
                        />
                    </div>

                    {/* AI Thinking indicator */}
                    {isLoading && (
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 300, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(10,22,40,0.88)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-xl)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Sparkles className="pulse" size={14} /> Thinking…
                        </div>
                    )}

                    {/* Canvas load error */}
                    {canvasLoadError && (
                        <div style={{ position: 'absolute', bottom: '6rem', left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(10px)', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius-lg)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', boxShadow: 'var(--shadow-float)', whiteSpace: 'nowrap' }}>
                            <AlertCircle size={15} />
                            <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Canvas load failed.</span>
                            <button onClick={() => { setCanvasLoadError(false); setCurrentWs({ ...currentWs }); }} style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', borderRadius: '0.4rem', padding: '0.2rem 0.55rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <RefreshCw size={11} /> Retry
                            </button>
                            <button onClick={() => setCanvasLoadError(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
                        </div>
                    )}

                    {/* Circle glow effect */}
                    {glowCircle && (
                        <div style={{ position: 'fixed', left: glowCircle.x, top: glowCircle.y, width: glowCircle.w, height: glowCircle.h, borderRadius: '50%', border: '3px solid #60a5fa', boxShadow: '0 0 24px #60a5fa, 0 0 60px rgba(96,165,250,0.4), inset 0 0 30px rgba(96,165,250,0.1)', animation: 'circleGlow 1s ease-in-out forwards', pointerEvents: 'none', zIndex: 99999 }} />
                    )}
                </div>

                {/* Workspace Map sidebar */}
                {showSidebar && (
                    <div className="glass-panel slide-in-right" style={{ position: 'absolute', right: '1rem', top: '4rem', bottom: '1rem', width: '280px', zIndex: 1000, borderRadius: 'var(--radius-lg)', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)' }}><Network size={16} color="#60a5fa" /> Workspace Map</h3>
                            <button onClick={() => setShowSidebar(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}><X size={18} /></button>
                        </div>
                        <PageTree nodeId="page:page" map={workspaceMap} onSelect={(id: any) => editor?.setCurrentPage(id)} currentId={editor?.getCurrentPageId() || ""} />
                    </div>
                )}

                {/* Knowledge pull-tab */}
                {hasMaterial && !showKnowledgeSidebar && (
                    <button onClick={() => setShowKnowledgeSidebar(true)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'var(--accent)', color: 'white', border: 'none', padding: '1rem 0.5rem', borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)', cursor: 'pointer', zIndex: 500, boxShadow: '-6px 0 20px rgba(59,130,246,0.3)' }}>
                        <BookOpen size={18} />
                    </button>
                )}

                {showProfile && <ProfileOverlay profile={profile} setProfile={setProfile} onSave={handleUpdateProfile} onClose={() => setShowProfile(false)} />}

                {/* ── MOBILE BAR ─────────────────────────────────── */}
                <div className="mobile-bar">
                    {/* Chat input row */}
                    <div className="mobile-input-row">
                        <input
                            ref={mobileInputRef}
                            className="mobile-input"
                            value={mobileInput}
                            onChange={e => setMobileInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleMobileSubmit(); }}
                            placeholder={isLoading ? 'AI is thinking…' : 'Ask EduGen anything…'}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleMobileSubmit}
                            disabled={isLoading || !mobileInput.trim()}
                            className="mobile-send-btn"
                        >
                            {isLoading ? <Sparkles size={18} className="pulse" color="white" /> : <Send size={18} color="white" />}
                        </button>
                    </div>

                    {/* Tool row */}
                    <div className="mobile-tool-row">
                        {tools.map(t => (
                            <button key={t.id} onClick={() => setTool(t.id)} className={`mobile-tool-btn${activeTool === t.id ? ' active' : ''}`}>
                                {t.icon}
                                <span className="label">{t.label}</span>
                            </button>
                        ))}
                        <button onClick={() => editor?.undo()} className="mobile-tool-btn">
                            <RotateCcw size={18} /><span className="label">Undo</span>
                        </button>
                        <button onClick={() => editor?.redo()} className="mobile-tool-btn">
                            <RotateCw size={18} /><span className="label">Redo</span>
                        </button>
                        <button onClick={addPage} className="mobile-tool-btn">
                            <PlusCircle size={18} /><span className="label">Page</span>
                        </button>
                        <button onClick={() => setShowSidebar(!showSidebar)} className={`mobile-tool-btn${showSidebar ? ' active' : ''}`}>
                            <History size={18} /><span className="label">Map</span>
                        </button>
                        <button onClick={() => { if (hasMaterial) setShowKnowledgeSidebar(!showKnowledgeSidebar); else document.getElementById('kb-input')?.click(); }} className={`mobile-tool-btn${hasMaterial ? ' active' : ''}`}>
                            <span style={{ fontSize: '16px', lineHeight: 1 }}>{hasMaterial ? '🧠' : '📎'}</span>
                            <span className="label">{hasMaterial ? 'KB' : 'Upload'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Knowledge Sidebar (desktop: right panel) ──── */}
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
