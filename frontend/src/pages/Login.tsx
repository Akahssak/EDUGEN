import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/authSlice';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

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
            const res = await axios.post(`${(import.meta as any).env.VITE_API_URL}/api/auth/google`, {
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
            const res = await axios.post(`${(import.meta as any).env.VITE_API_URL}${endpoint}`, payload);
            dispatch(login(res.data));
        } catch (err: any) {
            setError(err.response?.data?.detail || "Authentication failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e1b4b, #030712)',
            padding: '1rem'
        }}>
            <div className="glass-panel fade-in" style={{
                padding: '2.5rem',
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <img src="/logo.png" alt="EduGen Logo" style={{ width: '64px', height: '64px', borderRadius: '1.2rem', marginBottom: '1rem', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} />
                    <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
                        EduGen <span style={{ color: '#818cf8' }}>AI</span>
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.95rem' }}>
                        Empowering your learning journey
                    </p>
                </div>

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.3rem',
                    borderRadius: '0.8rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <button 
                        onClick={() => setIsLogin(true)}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '0.6rem', border: 'none',
                            background: isLogin ? '#4f46e5' : 'transparent',
                            color: isLogin ? 'white' : '#94a3b8',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >Login</button>
                    <button 
                        onClick={() => setIsLogin(false)}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '0.6rem', border: 'none',
                            background: !isLogin ? '#4f46e5' : 'transparent',
                            color: !isLogin ? 'white' : '#94a3b8',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >Register</button>
                </div>

                <form onSubmit={handleClassicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Full Name</label>
                            <input 
                                type="text" className="input-primary" placeholder="Enter your name" required
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                style={{ padding: '0.75rem', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    )}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Email Address</label>
                        <input 
                            type="email" className="input-primary" placeholder="name@example.com" required
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                            style={{ padding: '0.75rem', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>Password</label>
                        <input 
                            type="password" className="input-primary" placeholder="••••••••" required
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                            style={{ padding: '0.75rem', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{error}</p>}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {(import.meta as any).env.VITE_GOOGLE_CLIENT_ID === 'PASTE_YOUR_GOOGLE_CLIENT_ID_HERE' ? (
                        <div style={{ padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.8rem', color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>
                            ⚠️ Please add your Google Client ID to <code>.env</code> file to enable Google sign-in.
                        </div>
                    ) : (
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            theme="filled_black"
                            shape="pill"
                            size="large"
                            width="400"
                            text={isLogin ? "signin_with" : "signup_with"}
                        />
                    )}
                </div>

                <p style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'center', lineHeight: '1.5' }}>
                    By continuing, you agree to our Terms of Service and Privacy Policy. All your canvas data is private and encrypted.
                </p>
            </div>
        </div>
    );
}
