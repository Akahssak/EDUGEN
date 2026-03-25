import React from 'react';
import { Folder } from 'lucide-react';

interface PageTreeProps {
    nodeId: string;
    map: any;
    onSelect: (id: string) => void;
    currentId: string;
    depth?: number;
}

export default function PageTree({ nodeId, map, onSelect, currentId, depth = 0 }: PageTreeProps) {
    const node = map[nodeId];
    if (!node) return null;
    
    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-border-subtle/30 pl-2' : ''}`}>
            <div 
                onClick={() => onSelect(nodeId)} 
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${currentId === nodeId ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-muted hover:bg-bg-elevated/50 hover:text-white'}`}
            >
                {/* Visual branch indicator using border instead of special characters */}
                {depth > 0 && <span className="w-2 h-2 border-b border-l border-border-subtle/50 rounded-bl-sm -mt-1 opacity-50" />}
                
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
