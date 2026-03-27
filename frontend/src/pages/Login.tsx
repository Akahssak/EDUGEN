import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/authSlice';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import EduGenLogo from '../components/ui/EduGenLogo';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const dispatch = useDispatch();

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/auth/google', {
                token: credentialResponse.credential
            });
            dispatch(login(res.data));
        } catch (err: any) {
            console.error("Google Auth Error:", err);
            setError("Google sign-in failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClassicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isLogin) {
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongPasswordRegex.test(formData.password)) {
                setError("Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.");
                return;
            }
        }
        
        setLoading(true);
        setError('');
        
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin 
            ? { email: formData.email, password: formData.password }
            : { email: formData.email, password: formData.password, username: formData.name };

        try {
            const res = await api.post(endpoint, payload);
            dispatch(login(res.data));
        } catch (err: any) {
            setError(err.response?.data?.detail || "Authentication failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-bg-void flex items-center justify-center p-6 overflow-hidden grain">
            {/* Background Blobs */}
            <div className="blob bg-accent-primary/20 -top-48 -left-48" />
            <div className="blob bg-accent-secondary/20 bottom-0 -right-48" style={{ animationDelay: '-5s' }} />

            <div className="relative z-10 w-full max-w-[480px]">
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-block mb-6"
                    >
                        <EduGenLogo size="md" />
                    </motion.div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                        {isLogin ? 'Welcome Back' : 'Join the Galaxy'}
                    </h1>
                    <p className="text-text-muted text-sm font-body">
                        {isLogin ? 'Your infinite context awaits. Sign in to continue.' : 'Start your journey towards deeper understanding.'}
                    </p>
                </div>

                <GlassCard className="!p-8 shadow-2xl">
                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-bg-void/50 border border-border-subtle rounded-xl mb-8">
                        <button 
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isLogin ? 'bg-accent-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                        >
                            Login
                        </button>
                        <button 
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isLogin ? 'bg-accent-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleClassicSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent-primary transition-colors" size={18} />
                                    <input 
                                        type="text" required
                                        placeholder="Enter your name"
                                        className="w-full bg-bg-void/50 border border-border-subtle rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all text-sm font-body"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent-primary transition-colors" size={18} />
                                <input 
                                    type="email" required
                                    placeholder="name@example.com"
                                    className="w-full bg-bg-void/50 border border-border-subtle rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all text-sm font-body"
                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent-primary transition-colors" size={18} />
                                <input 
                                    type="password" required
                                    placeholder="••••••••"
                                    className="w-full bg-bg-void/50 border border-border-subtle rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all text-sm font-body"
                                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                {error}
                            </motion.p>
                        )}

                        <GlowButton 
                            type="submit" 
                            disabled={loading} 
                            className="w-full !rounded-xl active:scale-[0.98]"
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                            {!loading && <ArrowRight size={18} className="ml-2" />}
                        </GlowButton>
                    </form>

                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-[1px] bg-border-subtle"></div>
                        <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Secure Connect</span>
                        <div className="flex-1 h-[1px] bg-border-subtle"></div>
                    </div>

                    <div className="flex justify-center">
                         <GoogleLogin
                             onSuccess={handleGoogleSuccess}
                             onError={() => setError('Google Login Failed')}
                             theme="filled_black"
                             shape="pill"
                             width="400"
                             size="large"
                             text={isLogin ? "signin_with" : "signup_with"}
                         />
                    </div>

                    <p className="mt-8 text-center text-[10px] text-text-dim font-mono uppercase tracking-wider leading-relaxed">
                        By continuing, you agree to the Intelligent Cosmos protocol 
                        and privacy protection standards.
                    </p>
                </GlassCard>
            </div>
        </div>
    );
}
