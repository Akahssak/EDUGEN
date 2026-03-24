import { useState } from 'react';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import { AiTextShapeUtil } from '../shapes/AiTextShape';
import { AiMermaidShapeUtil } from '../shapes/AiMermaidShape';
import { AiResponseOverlay } from './AiResponseOverlay';
import { useCircleDetection } from '../hooks/useCircleDetection';
import { analyzeRegion } from '../services/analysisService';
import { ModelConfig } from '../types';
import { Send, LogOut, BookOpen } from 'lucide-react';

const customShapeUtils = [AiTextShapeUtil, AiMermaidShapeUtil];

export function Canvas() {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        apiKey: '',
    });

    useCircleDetection(editor, async (base64, bounds, center) => {
        if (!editor || isAnalyzing) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await analyzeRegion({
                imageBase64: base64,
                boundingBox: bounds,
                model: modelConfig
            });

            const baseX = center.x + result.coordinates.x_offset;
            const baseY = bounds.y + bounds.h + result.coordinates.y_offset;

            if (result.explanation) {
                editor.createShape({
                    id: createShapeId(),
                    type: 'ai-text',
                    x: baseX,
                    y: baseY,
                    props: { text: result.explanation, w: 300, h: 150 }
                } as any);
            }

            if (result.diagram) {
                editor.createShape({
                    id: createShapeId(),
                    type: 'ai-mermaid',
                    x: baseX,
                    y: baseY + 180,
                    props: { code: result.diagram, w: 500, h: 400 }
                } as any);
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Failed to analyze');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsAnalyzing(false);
        }
    });

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex' }}>
            <div style={{
                position: 'absolute', top: 16, left: 60, zIndex: 1000,
                background: 'rgba(30, 41, 59, 0.9)', padding: '12px 24px', borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', display: 'flex', gap: '20px',
                alignItems: 'center', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', marginRight: '20px' }}>
                    <BookOpen color="var(--accent-color)" size={24} /> EduGen AI
                </div>

                <button onClick={() => window.location.href = '/chat'} style={{
                    background: 'transparent', border: '1px solid #475569', color: 'white',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s'
                }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Send size={16} /> Open Chat
                </button>

                <button onClick={() => {
                    localStorage.removeItem('edugen_user');
                    window.location.href = '/login';
                }} style={{
                    background: 'transparent', border: 'none', color: '#94a3b8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            <AiResponseOverlay isAnalyzing={isAnalyzing} error={error} />

            <div style={{ flex: 1, position: 'relative' }}>
                <Tldraw
                    onMount={setEditor}
                    shapeUtils={customShapeUtils}
                />
            </div>
        </div>
    );
}
