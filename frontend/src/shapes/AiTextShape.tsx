import { HTMLContainer, ShapeUtil, TLBaseShape, Rectangle2d, T, useEditor } from 'tldraw';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect, useRef } from 'react';

export type IAiTextShape = TLBaseShape<'ai-text', { text: string; w: number; h: number }>;

// Auto-sizing text card — measures its own height and notifies the shape
function AutoCard({ shape, text }: { shape: IAiTextShape; text: string }) {
    const editor = useEditor();
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Typewriter effect
    useEffect(() => {
        let i = 0;
        setDisplayed('');
        setDone(false);
        const iv = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) { clearInterval(iv); setDone(true); }
        }, 10);
        return () => clearInterval(iv);
    }, [text]);

    // Auto-resize: after each render update, measure content and update shape height
    useEffect(() => {
        if (!contentRef.current) return;
        const el = contentRef.current;
        const newH = Math.max(120, el.scrollHeight + 48); // 48px padding top+bottom
        if (Math.abs(newH - shape.props.h) > 8) {
            editor.updateShape({ id: shape.id, type: 'ai-text', props: { ...shape.props, h: newH } });
        }
    });

    return (
        <div ref={contentRef} className="ai-md" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
            {!done && <span className="typing-cursor">|</span>}
        </div>
    );
}

export class AiTextShapeUtil extends ShapeUtil<any> {
    static override type = 'ai-text' as const;
    static override props = { text: T.string, w: T.number, h: T.number };

    getDefaultProps() { return { text: '', w: 420, h: 120 }; }

    indicator(shape: any) {
        return <rect width={shape.props.w} height={shape.props.h} rx={0} opacity={0} />;
    }

    getGeometry(shape: any) {
        return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
    }

    component(shape: IAiTextShape) {
        return (
            <HTMLContainer
                style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'transparent',
                    border: 'none',
                    padding: '0',
                    overflow: 'visible',
                    pointerEvents: 'all',
                    color: '#f1f5f9',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                }}
            >
                <AutoCard shape={shape} text={shape.props.text} />
                <style>{`
                    .ai-md h1,.ai-md h2,.ai-md h3{margin:0 0 10px;color:#60a5fa;font-weight:700;text-shadow:0 0 14px rgba(96,165,250,.5)}
                    .ai-md p{margin:0 0 8px}
                    .ai-md ul,.ai-md ol{padding-left:18px;margin:0 0 8px}
                    .ai-md li{margin-bottom:4px}
                    .ai-md strong{color:#93c5fd}
                    .ai-md code{background:rgba(99,102,241,.25);padding:2px 6px;border-radius:4px;color:#a5b4fc;font-size:13px}
                    .typing-cursor{display:inline-block;width:2px;height:.9em;background:#60a5fa;margin-left:2px;animation:blink .8s step-end infinite;vertical-align:middle;box-shadow:0 0 8px #60a5fa}
                    @keyframes blink{from,to{opacity:1}50%{opacity:0}}
                `}</style>
            </HTMLContainer>
        );
    }
}
