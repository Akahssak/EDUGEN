import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Send, LogOut, Sparkles, BookOpen, BrainCircuit, History, X, PlusCircle, RotateCcw, RotateCw, ArrowLeft, Network, ChevronRight, LayoutGrid, Folders, Folder, Plus, User as UserIcon, Settings, Save, Trash2, AlertCircle, RefreshCw, FileText, Maximize2, Minimize2, Search, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import EduGenLogo from '../components/ui/EduGenLogo';
import GlowButton from '../components/ui/GlowButton';
import GlassCard from '../components/ui/GlassCard';
import AgentThinkingIndicator from '../components/ui/AgentThinkingIndicator';
import { ConceptTag, PulsingDot } from '../components/ui/ConceptTag';
import StreamedText from '../components/ui/StreamedText';

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

export default function Chat({ onLogout }: any) {
    const navigate = useNavigate();
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

    // 1. Workspace Guard: Redirect to Dashboard if none selected
    useEffect(() => {
        if (!currentWs) {
            navigate('/dashboard');
        }
    }, [currentWs, navigate]);

    if (!currentWs) return null;

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

    // 2. Main 3-Panel Cosmos View
    return (
        <div className="flex h-screen w-full bg-bg-void overflow-hidden text-text-primary font-body grain selection:bg-accent-primary/30 selection:text-white">
            
            {/* ── Left Sidebar: Navigation & Context ──────────────────── */}
            <aside className="w-[280px] hidden lg:flex flex-col bg-bg-surface/50 border-r border-border-subtle backdrop-blur-3xl z-30">
                <div className="p-8 pb-4">
                    <EduGenLogo size="sm" />
                </div>

                <div className="px-6 mb-6">
                    <div className="p-4 bg-bg-elevated/40 border border-border-subtle rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                                <Plus size={18} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Brain Space</span>
                        </div>
                        <h2 className="text-sm font-bold truncate mb-1">{currentWs.name}</h2>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-dim uppercase tracking-wider">
                            <PulsingDot />
                            Active Concept
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 overflow-y-auto space-y-1">
                    <div className="px-4 py-2 text-[10px] font-mono text-text-dim uppercase tracking-widest opacity-50">Canvas Map</div>
                    <PageTree nodeId="page:page" map={workspaceMap} onSelect={(id: any) => editor?.setCurrentPage(id)} currentId={editor?.getCurrentPageId() || ""} />
                </div>

                <div className="p-6 border-t border-border-subtle bg-bg-surface/20">
                    <div className="flex items-center gap-3 mb-4 group cursor-pointer" onClick={() => setShowProfile(true)}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center border border-white/10 group-hover:shadow-[0_0_15px_rgba(79,142,247,0.3)] transition-all">
                            <UserIcon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate group-hover:text-accent-primary transition-colors">{user?.username || 'Learner'}</div>
                            <div className="text-[9px] font-mono text-text-dim">Settings & Profile</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setCurrentWs(null)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-text-dim hover:text-white hover:bg-bg-elevated/50 border border-transparent hover:border-border-subtle transition-all"
                    >
                        <ChevronRight size={14} className="rotate-180" />
                        Back to Spaces
                    </button>
                </div>
            </aside>

            {/* ── Main Panel: Canvas & Thinking ──────────────────────── */}
            <main className="flex-1 relative bg-bg-void z-10 flex flex-col min-w-0">
                
                {/* Canvas Overlay Header */}
                <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <div className="px-4 py-2 bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-full text-xs font-bold text-text-muted flex items-center gap-2 shadow-xl">
                            <LayoutGrid size={14} className="text-accent-primary" />
                            {editor?.getCurrentPage()?.name || 'Main Board'}
                        </div>
                        {pageHistory.length > 0 && (
                            <button
                                onClick={() => {
                                    const last = pageHistory[pageHistory.length - 1];
                                    editor?.setCurrentPage(last as any);
                                    setPageHistory(p => p.slice(0, -1));
                                }}
                                className="px-4 py-2 bg-accent-primary/10 backdrop-blur-xl border border-accent-primary/30 rounded-full text-xs font-bold text-accent-primary flex items-center gap-2 shadow-xl hover:bg-accent-primary/20 transition-all active:scale-95"
                            >
                                <ArrowLeft size={14} /> Parent Space
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                        {isLoading && <AgentThinkingIndicator />}
                        <button 
                            onClick={() => document.getElementById('kb-input')?.click()}
                            className="w-10 h-10 bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-full flex items-center justify-center text-text-muted hover:text-white hover:border-accent-primary/40 transition-all shadow-xl"
                            title="Upload Knowledge"
                        >
                            <Library size={18} />
                        </button>
                        <input id="kb-input" type="file" accept=".pdf,.txt" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
                        />
                    </div>
                </header>

                {/* The Tldraw Surface */}
                <div className="flex-1 w-full h-full relative z-0">
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

                    {/* Simple Brush Selector / Floating Toolbar (Canvas Bottom) */}
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 px-2 py-2 bg-bg-surface/60 backdrop-blur-2xl border border-border-subtle rounded-2xl flex items-center gap-1 shadow-2xl scale-90 md:scale-100">
                        {tools.map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setTool(t.id)} 
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === t.id ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' : 'text-text-dim hover:bg-bg-elevated/50 hover:text-white'}`}
                                title={t.label}
                            >
                                {t.icon}
                            </button>
                        ))}
                        <div className="w-[1px] h-6 bg-border-subtle mx-1" />
                        <button onClick={() => editor?.undo()} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:bg-bg-elevated/50 transition-all"><RotateCcw size={16} /></button>
                        <button onClick={() => editor?.redo()} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:bg-bg-elevated/50 transition-all"><RotateCw size={16} /></button>
                        <button onClick={addPage} className="w-10 h-10 rounded-xl flex items-center justify-center text-text-dim hover:bg-bg-elevated/50 transition-all"><PlusCircle size={16} /></button>
                    </div>

                    {/* Floating Universal Command / Chat Bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl px-2 py-2">
                        <div className="relative group overflow-hidden rounded-2xl bg-bg-surface/80 backdrop-blur-3xl border border-border-subtle shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] focus-within:border-accent-primary/40 focus-within:ring-4 focus-within:ring-accent-primary/5 transition-all">
                            
                            {/* Animated Under-glow */}
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity blur-[1px]"></div>

                            <input 
                                className="w-full bg-transparent py-4 pl-14 pr-24 outline-none font-body text-sm text-text-primary placeholder:text-text-dim"
                                placeholder={isLoading ? "Agent thinking..." : "Explain this concept deeply..."}
                                value={mobileInput}
                                onChange={e => setMobileInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleMobileSubmit(); }}
                            />

                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-primary">
                                <Sparkles size={22} className={isLoading ? "animate-pulse" : ""} />
                            </div>

                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <GlowButton 
                                    onClick={handleMobileSubmit}
                                    disabled={isLoading || !mobileInput.trim()}
                                    className="!px-5 !py-1.5 text-xs h-9"
                                >
                                    {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                    Send
                                </GlowButton>
                            </div>
                        </div>
                    </div>

                    {/* Circle detection glow overlay */}
                    <AnimatePresence>
                        {glowCircle && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                style={{ 
                                    position: 'fixed', 
                                    left: glowCircle.x, 
                                    top: glowCircle.y, 
                                    width: glowCircle.w, 
                                    height: glowCircle.h, 
                                    borderRadius: '50%', 
                                    border: '3px solid #38bdf8',
                                    boxShadow: '0 0 40px rgba(56,189,248,0.6), inset 0 0 40px rgba(56,189,248,0.2)',
                                    zIndex: 9999,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* ── Right Panel: Knowledge Vault ───────────────────────── */}
            <AnimatePresence>
                {showKnowledgeSidebar && (
                    <KnowledgeSidebar
                        content={uploadedFileContent}
                        metadata={materialMetadata}
                        onClose={() => setShowKnowledgeSidebar(false)}
                        scrollToPhrase={scrollToPhrase}
                        onBrief={(txt: string) => handlePromptSubmit(`Please brief this topic from my material: ${txt}`, 100, 100)}
                    />
                )}
            </AnimatePresence>

            {/* Profile & History Overlays */}
            <AnimatePresence>
                {showProfile && (
                    <ProfileOverlay 
                        profile={profile} 
                        setProfile={setProfile} 
                        onSave={handleUpdateProfile} 
                        onClose={() => setShowProfile(false)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Sub-component: Knowledge Sidebar (Right Panel)
function KnowledgeSidebar({ content, metadata, onClose, scrollToPhrase, onBrief }: any) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const contentSegments = content.split('\n\n').filter(Boolean);

    useEffect(() => {
        if (scrollToPhrase && scrollRef.current) {
            const elements = scrollRef.current.querySelectorAll('.content-segment');
            for (const el of elements) {
                if (el.textContent?.toLowerCase().includes(scrollToPhrase.toLowerCase())) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-accent-primary/20', 'border-accent-primary/50', 'shadow-[0_0_20px_rgba(79,142,247,0.2)]');
                    setTimeout(() => el.classList.remove('bg-accent-primary/20', 'border-accent-primary/50', 'shadow-[0_0_20px_rgba(79,142,247,0.2)]'), 5000);
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
        <motion.aside 
            initial={{ x: 450 }}
            animate={{ x: 0 }}
            exit={{ x: 450 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[450px] bg-bg-surface/80 border-l border-border-subtle backdrop-blur-3xl z-40 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        >
            <div className="p-6 border-b border-border-subtle bg-bg-surface/20 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-display font-bold text-accent-primary flex items-center gap-3">
                        <Library size={20} /> Knowledge Base
                    </h3>
                    <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest mt-1">{metadata?.name || 'Indexed Intelligence'}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-elevated transition-colors text-text-dim hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 bg-bg-void/30">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent-primary transition-colors" size={14} />
                    <input 
                        placeholder="Search workspace knowledge..."
                        className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
            >
                {filteredSegments.map((segment: any, i: number) => (
                    <div 
                        key={i} 
                        className={`content-segment p-4 rounded-xl bg-bg-elevated/20 border border-border-subtle hover:border-accent-primary/30 transition-all relative group ${segment.isMatch ? 'bg-accent-primary/10 border-accent-primary/40' : ''}`}
                    >
                        <p className="text-sm leading-relaxed text-text-muted group-hover:text-text-primary transition-colors">
                            {segment.text}
                        </p>
                        <button 
                            onClick={() => onBrief(segment.text)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-3 py-1 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-[10px] font-bold text-accent-primary backdrop-blur-md transition-all active:scale-95"
                        >
                            Brief This
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-bg-void/50 border-t border-border-subtle flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse shadow-[0_0_8px_rgba(79,142,247,0.6)]" />
                <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest leading-none">AI context active: {metadata?.chunks || 0} chunks</span>
            </div>
        </motion.aside>
    );
}

// Sub-component: Personal AI Context (Profile Overlay)
function ProfileOverlay({ profile, setProfile, onSave, onClose }: any) {
    const [editingInterests, setEditingInterests] = React.useState(false);
    const interestTags = (profile.interests || '').split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm"
            />
            
            <GlassCard className="w-full max-w-xl relative z-10 flex flex-col p-8 sm:p-10 !bg-bg-surface/90">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        <UserIcon className="text-accent-primary" size={24} /> 
                        AI Training Context
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-elevated transition-colors text-text-dim hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                    Adjust how the AI perceives your background and goals. This data shapes every analogy and visual generated for you.
                </p>

                <div className="space-y-8">
                    {/* Bio */}
                    <div>
                        <label className="block text-[10px] font-mono text-accent-primary uppercase tracking-widest mb-3">Professional Bio / Learning Goals</label>
                        <textarea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="E.g. Engineering student, prefers physics analogies..."
                            className="w-full h-32 bg-bg-void/50 border border-border-subtle rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* Interests */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-mono text-accent-primary uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={12} /> Detected Interests
                            </label>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingInterests(!editingInterests)} className="text-[10px] font-bold text-accent-primary hover:underline uppercase tracking-tighter">
                                    {editingInterests ? 'Lock' : 'Manually Edit'}
                                </button>
                                <button onClick={() => setProfile({ ...profile, interests: '' })} className="text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:underline uppercase tracking-tighter">
                                    Clear
                                </button>
                            </div>
                        </div>

                        {editingInterests ? (
                            <input
                                value={profile.interests || ''}
                                onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                                className="w-full bg-bg-void/50 border border-accent-secondary/30 rounded-xl p-3 text-sm text-text-primary outline-none focus:border-accent-secondary/60 transition-all font-mono"
                                placeholder="Quantum Physics | Architecture | Sci-Fi..."
                            />
                        ) : (
                            <div className="min-h-[60px] bg-bg-void/30 border border-border-subtle rounded-2xl p-4 flex flex-wrap gap-2 items-center">
                                {interestTags.length === 0 ? (
                                    <span className="text-xs text-text-dim italic">AI will detect your interests as you interact with the canvas...</span>
                                ) : (
                                    interestTags.map((tag: string, i: number) => <ConceptTag key={i} text={tag} />)
                                )}
                            </div>
                        )}
                    </div>

                    {/* Learning Depth */}
                    <div>
                        <label className="block text-[10px] font-mono text-accent-primary uppercase tracking-widest mb-3">Complexity Preference</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setProfile({ ...profile, learning_style: lvl })}
                                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${profile.learning_style === lvl ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_20px_rgba(79,142,247,0.1)]' : 'bg-transparent border-border-subtle text-text-dim hover:border-text-dim/30'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <GlowButton onClick={onSave} className="w-full !py-4 rounded-2xl flex items-center justify-center gap-3">
                        <Save size={18} />
                        Update AI Personality
                    </GlowButton>
                </div>
            </GlassCard>
        </div>
    );
}

function PageTree({ nodeId, map, onSelect, currentId, depth = 0 }: any) {
    const node = map[nodeId];
    if (!node) return null;
    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-border-subtle/30 pl-2' : ''}`}>
            <div 
                onClick={() => onSelect(nodeId)} 
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${currentId === nodeId ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-muted hover:bg-bg-elevated/50 hover:text-white'}`}
            >
                {depth > 0 && <span className="opacity-30">ㄴ</span>}
                <Folder size={12} className={currentId === nodeId ? 'text-accent-primary' : 'text-text-dim'} />
                <span className="text-xs truncate font-medium">{node.name}</span>
                {currentId === nodeId && <div className="ml-auto w-1 h-1 rounded-full bg-accent-primary shadow-[0_0_5px_rgba(79,142,247,1)]" />}
            </div>
            {node.children && node.children.map((cid: string) => (
                <PageTree key={cid} nodeId={cid} map={map} onSelect={onSelect} currentId={currentId} depth={depth + 1} />
            ))}
        </div>
    );
}
