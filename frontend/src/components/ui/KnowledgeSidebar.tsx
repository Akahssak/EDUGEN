import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Library, X, Search } from 'lucide-react';

interface KnowledgeSidebarProps {
    content: string;
    metadata: any;
    onClose: () => void;
    scrollToPhrase: string;
    onBrief: (text: string) => void;
}

export default function KnowledgeSidebar({ content, metadata, onClose, scrollToPhrase, onBrief }: KnowledgeSidebarProps) {
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
            className="w-[450px] bg-bg-surface/80 border-l border-border-subtle backdrop-blur-3xl z-40 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] h-full h-screen fixed top-0 right-0 md:relative"
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
