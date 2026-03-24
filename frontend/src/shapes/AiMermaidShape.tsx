import { HTMLContainer, ShapeUtil, TLBaseShape, Rectangle2d, T } from 'tldraw';
import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';

export type IAiMermaidShape = TLBaseShape<
    'ai-mermaid',
    { code: string; w: number; h: number }
>;

export class AiMermaidShapeUtil extends ShapeUtil<any> {
    static override type = 'ai-mermaid' as const;
    static override props = {
        code: T.string,
        w: T.number,
        h: T.number,
    };

    getDefaultProps() {
        return {
            code: '',
            w: 400,
            h: 300,
        };
    }

    indicator(shape: any) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }

    getGeometry(shape: any) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        });
    }

    component(shape: IAiMermaidShape) {
        return <MermaidRenderer shape={shape} />;
    }
}

function MermaidRenderer({ shape }: { shape: IAiMermaidShape }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string>('');
    const [isDrawing, setIsDrawing] = useState(false);
    const id = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark', // Using dark theme for the midnight board
            themeVariables: {
                primaryColor: '#3b82f6',
                lineColor: '#60a5fa',
                textColor: '#f8fafc',
                mainBkg: '#1e293b',
            }
        });

        if (shape.props.code) {
            setIsDrawing(true);
            let code = shape.props.code.replace(/```mermaid/g, '').replace(/```/g, '').trim();

            // Post-processing to fix common AI hallucinations in Mermaid
            const sanitize = (c: string) => {
                return c
                    // Fix: encoder -->|N=6|> decoder  => encoder -->|N=6| decoder
                    .replace(/--\|([^|]+)\|>/g, '--|$1|')
                    .replace(/-->\|([^|]+)\|>/g, '-->|$1|')
                    // Fix unquoted parentheses in labels if AI missed it
                    .replace(/(\w+)\(([^)]+)\)/g, (match, id, text) => {
                        if (id === 'graph' || id === 'subgraph' || id === 'click') return match;
                        return `${id}["${id}(${text})"]`;
                    });
            };

            const cleanCode = sanitize(code);

            mermaid.render(id.current, cleanCode).then(({ svg }) => {
                setSvgContent(svg);
                setTimeout(() => setIsDrawing(false), 2000);
            }).catch(e => {
                console.error('Mermaid render error:', e);
                setSvgContent(`<div style="color:#ef4444; font-size: 11px; padding: 10px;">Visual Syntax Error: AI generated an invalid diagram.<br/>Generating fallback...</div>`);
                setIsDrawing(false);
            });
        }
    }, [shape.props.code]);

    return (
        <HTMLContainer
            style={{
                width: shape.props.w,
                height: shape.props.h,
                background: 'transparent',
                border: 'none',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                pointerEvents: 'all',
                overflow: 'visible'
            }}
        >
            <div
                ref={containerRef}
                className={isDrawing ? 'mermaid-drawing' : 'mermaid-complete'}
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{ width: '100%', height: '100%', overflow: 'visible', display: 'flex', justifyContent: 'center' }}
            />
            <style>
                {`
                    @keyframes drawPath {
                        from { stroke-dashoffset: 1000; opacity: 0; }
                        to { stroke-dashoffset: 0; opacity: 1; }
                    }
                    
                    .mermaid-drawing svg path, 
                    .mermaid-drawing svg line, 
                    .mermaid-drawing svg rect,
                    .mermaid-drawing svg polygon {
                        stroke-dasharray: 1000;
                        stroke-dashoffset: 1000;
                        animation: drawPath 2s ease-out forwards;
                    }

                    .mermaid-drawing svg text {
                        opacity: 0;
                        animation: fadeIn 0.5s ease-out 1.5s forwards;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(5px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* Theme adjustments for Mermaid SVG */
                    svg {
                        max-width: 100%;
                        height: auto;
                    }
                    .node rect, .node circle, .node polygon {
                        stroke: #3b82f6 !important;
                        fill: #1e293b !important;
                        stroke-width: 2px !important;
                    }
                    .edgePath path {
                        stroke: #60a5fa !important;
                        stroke-width: 2px !important;
                    }
                    .label text {
                        fill: #f8fafc !important;
                        font-family: 'Inter', sans-serif !important;
                    }
                    .marker {
                        fill: #60a5fa !important;
                        stroke: #60a5fa !important;
                    }
                `}
            </style>
        </HTMLContainer>
    );
}
