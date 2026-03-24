import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export default function Mermaid({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            securityLevel: 'loose',
        });
    }, []);

    useEffect(() => {
        if (chart) {
            mermaid.render(`mermaid-${Date.now()}`, chart)
                .then(({ svg }) => setSvg(svg))
                .catch((error) => console.error('Mermaid error:', error));
        }
    }, [chart]);

    return (
        <div
            className="mermaid-diagram"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ width: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center' }}
        />
    );
}
