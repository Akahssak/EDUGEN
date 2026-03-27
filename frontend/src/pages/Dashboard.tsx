import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, Clock, FileText, User as UserIcon, LogOut, ChevronRight, Search, Sparkles, BookOpen } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import api from '../services/api';
import EduGenLogo from '../components/ui/EduGenLogo';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import { PulsingDot } from '../components/ui/ConceptTag';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
        navigate('/login');
        return;
    }
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get(`/api/workspaces/${user.id}`);
        setWorkspaces(res.data);
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, [user, navigate]);

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter a name for your new workspace:");
    if (!name || !user) return;

    try {
      const res = await api.post('/api/workspaces', {
        name,
        user_id: user.id
      });
      setWorkspaces([res.data, ...workspaces]);
    } catch (err) {
      console.error("Failed to create workspace", err);
      alert("Failed to create workspace. Please try again.");
    }
  };

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const filteredWorkspaces = workspaces.filter(ws => 
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-bg-void text-text-primary overflow-hidden font-body grain">
      
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-[280px] hidden lg:flex flex-col bg-bg-surface/50 border-r border-border-subtle backdrop-blur-xl z-20">
        <div className="p-8">
          <EduGenLogo size="sm" />
        </div>

        <div className="px-6 mb-8">
          <GlowButton className="w-full !py-2.5 text-sm" onClick={handleCreateWorkspace}>
            <Plus size={18} className="mr-2" />
            New Workspace
          </GlowButton>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto space-y-2">
          <div className="px-4 py-2 text-[10px] font-mono text-text-dim uppercase tracking-widest">Navigation</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 transition-all font-medium">
            <LayoutGrid size={18} />
            Workspaces
          </button>
        </nav>

        <div className="p-6 border-t border-border-subtle bg-bg-surface/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center border border-white/10 shadow-lg">
              <UserIcon size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user?.username || 'Learner'}</div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                <PulsingDot />
                AI: Gemini Flash
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-text-dim hover:text-white hover:bg-bg-elevated/50 transition-all"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10 px-6 py-12 md:px-12">
        {/* Background Blobs (Drifting) */}
        <div className="blob bg-accent-primary/10 -top-48 -right-48" />
        <div className="blob bg-accent-secondary/10 bottom-0 -left-48" style={{ animationDelay: '-8s' }} />

        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Your Workspaces</h1>
            <p className="text-text-muted">Good evening, <span className="text-text-primary capitalize">{user?.username || 'Learner'}</span>. Ready to dive deep?</p>
          </div>
          
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all font-body text-sm"
            />
          </div>
        </header>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-bg-surface/30 animate-pulse border border-border-subtle" />
            ))
          ) : filteredWorkspaces.length > 0 ? (
            filteredWorkspaces.map((ws, idx) => (
              <GlassCard 
                key={ws.id} 
                delay={idx * 0.1}
                className="group cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/chat?ws=${ws.id}`)}
              >
                <div className="h-full flex flex-col pointer-events-none">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary group-hover:bg-accent-primary group-hover:text-white transition-all duration-500">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-elevated/50 rounded-lg text-[10px] font-mono text-text-muted">
                        <FileText size={12} />
                        {ws.document_count || 0} Docs
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent-primary transition-colors">{ws.name}</h3>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-dim">
                      Active {ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : 'Just now'}
                    </span>
                    <ChevronRight size={18} className="text-text-dim group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-bg-surface flex items-center justify-center border border-border-subtle mb-6 relative">
                 <Sparkles className="text-accent-glow absolute -top-2 -right-2 animate-bounce" size={24} />
                 <BookOpen size={40} className="text-text-dim" />
              </div>
              <h2 className="text-xl font-bold mb-2">Create your first workspace</h2>
              <p className="text-text-muted max-w-sm mb-8">Start your learning journey by creating an environment for your specific subject or interest.</p>
              <GlowButton onClick={handleCreateWorkspace}>
                 Create Workspace
              </GlowButton>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-bg-surface/90 backdrop-blur-2xl border-t border-border-subtle z-50 px-6 py-4 flex items-center justify-around">
        <button className="flex flex-col items-center gap-1 text-accent-primary">
          <LayoutGrid size={24} />
          <span className="text-[10px] font-bold uppercase">Workspaces</span>
        </button>
        <button 
          onClick={handleCreateWorkspace}
          className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center -translate-y-6 shadow-lg shadow-accent-primary/40 border-4 border-bg-void active:scale-90 transition-transform"
        >
          <Plus size={28} className="text-white" />
        </button>
        <button className="flex flex-col items-center gap-1 text-text-muted" onClick={() => navigate('/chat')}>
          <UserIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Chat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-text-muted" onClick={onLogout}>
          <LogOut size={24} />
          <span className="text-[10px] font-bold uppercase">Exit</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
