import { HTMLContainer, ShapeUtil, TLBaseShape, Rectangle2d, T } from 'tldraw';

export type IDoubtMarkShape = TLBaseShape<
    'doubt-mark',
    { pageId: string; label: string }
>;

export class DoubtMarkShapeUtil extends ShapeUtil<any> {
    static override type = 'doubt-mark' as const;
    static override props = {
        pageId: T.string,
        label: T.string,
    };

    getDefaultProps() {
        return { pageId: '', label: '🔍 Deep Dive' };
    }

    indicator(shape: any) {
        return <circle cx={30} cy={30} r={30} />;
    }

    getGeometry(shape: any) {
        return new Rectangle2d({ width: 60, height: 60, isFilled: true });
    }

    component(shape: IDoubtMarkShape) {
        return (
            <HTMLContainer
                style={{ width: 60, height: 60, pointerEvents: 'all', position: 'relative', cursor: 'pointer' }}
            >
                {/* Pulsing ring */}
                <div style={{
                    position: 'absolute', inset: -8,
                    borderRadius: '50%',
                    border: '2px solid rgba(96,165,250,0.6)',
                    animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                    pointerEvents: 'none',
                }} />
                {/* Main dot */}
                <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.7), 0 0 40px rgba(139,92,246,0.3)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white',
                    fontSize: '11px', fontWeight: 700,
                    fontFamily: 'Inter, sans-serif',
                    gap: '2px',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>🔍</span>
                    <span style={{ fontSize: '8px', opacity: 0.9 }}>DIVE IN</span>
                </div>
                {/* Tooltip label */}
                <div style={{
                    position: 'absolute', top: '70px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(96,165,250,0.4)',
                    color: '#93c5fd', fontSize: '11px', fontWeight: 600,
                    padding: '4px 10px', borderRadius: '8px',
                    whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
                    pointerEvents: 'none',
                }}>
                    {shape.props.label}
                </div>
                <style>{`
                    @keyframes ping {
                        75%, 100% { transform: scale(1.8); opacity: 0; }
                    }
                `}</style>
            </HTMLContainer>
        );
    }
}
