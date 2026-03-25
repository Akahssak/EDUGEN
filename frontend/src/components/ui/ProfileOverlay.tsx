import React from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, X, Sparkles, Save } from 'lucide-react';
import GlassCard from './GlassCard';
import GlowButton from './GlowButton';
import { ConceptTag } from './ConceptTag';

interface ProfileOverlayProps {
    profile: any;
    setProfile: (profile: any) => void;
    onSave: () => void;
    onClose: () => void;
}

export default function ProfileOverlay({ profile, setProfile, onSave, onClose }: ProfileOverlayProps) {
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
