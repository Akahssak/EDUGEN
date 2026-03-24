import { useEffect } from 'react';
import { Editor, TLShape } from 'tldraw';

export function useCircleDetection(
    editor: Editor | null,
    onCircleDrawn: (base64: string, bounds: { x: number, y: number, w: number, h: number }, center: { x: number, y: number }) => void
) {
    useEffect(() => {
        if (!editor) return;

        const cleanup = editor.sideEffects.registerAfterCreateHandler('shape', (shape: TLShape) => {
            if (shape.type === 'geo' && shape.props.geo === 'ellipse') {
                // Wait a tick for the shape to be fully created and bounds calculated
                setTimeout(async () => {
                    const bounds = editor.getShapePageBounds(shape);
                    if (!bounds) return;

                    // For simplicity, we get all shapes intersecting the bounds, omitting the circle itself
                    const shapesToExport = editor.getCurrentPageShapes().filter(s => {
                        if (s.id === shape.id) return false;
                        const sBounds = editor.getShapePageBounds(s);
                        return sBounds && bounds.contains(sBounds);
                    });

                    if (shapesToExport.length === 0) return;

                    try {
                        // Export to Blob
                        const result = await editor.toImage(
                            shapesToExport.map(s => s.id),
                            { format: 'png', background: true, padding: 16 }
                        );

                        // Convert Blob to Base64
                        const base64 = await blobToBase64(result.blob);
                        // Clean up base64 prefix
                        const cleanBase64 = base64.split(',')[1];

                        onCircleDrawn(
                            cleanBase64,
                            { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
                            { x: bounds.midX, y: bounds.midY }
                        );
                    } catch (e) {
                        console.error('Export failed', e);
                    }
                }, 100);
            }
        });

        return () => {
            cleanup();
        };
    }, [editor, onCircleDrawn]);
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
