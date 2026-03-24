import { ShapeUtil, HTMLContainer, Rectangle2d, T } from 'tldraw';

export class AiSourceMarkerUtil extends ShapeUtil<any> {
    static override type = 'ai-source-marker' as const;
    static override props = {
        w: T.number,
        h: T.number,
        phrase: T.string,
    };

    override getDefaultProps() {
        return {
            w: 24,
            h: 24,
            phrase: '',
        };
    }

    override getGeometry(shape: any) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        });
    }

    override component(shape: any) {
        return (
            <HTMLContainer
                style={{
                    pointerEvents: 'all',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: '2px solid white',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                    width: shape.props.w,
                    height: shape.props.h,
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    console.log("Source marker clicked:", shape.props.phrase);
                    window.dispatchEvent(new CustomEvent('edugen:scroll-to-source', {
                        detail: { phrase: shape.props.phrase }
                    }));
                }}
            >
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'white' }} />
            </HTMLContainer>
        );
    }

    override indicator(shape: any) {
        return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
    }
}
