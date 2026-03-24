import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/authSlice';

export default function Login() {
    const [username, setUsername] = useState('');
    const dispatch = useDispatch();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (username.trim()) {
            try {
                const response = await fetch('http://localhost:8001/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username.trim() })
                });
                if (response.ok) {
                    const data = await response.json();
                    dispatch(login({ id: data.id, name: data.name }));
                } else {
                    console.error("Login failed");
                }
            } catch (err) {
                console.error("Error connecting to server:", err);
            }
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e293b, #0f172a)'
        }}>
            <form
                onSubmit={handleSubmit}
                className="glass-panel fade-in"
                style={{
                    padding: '3rem',
                    borderRadius: '1rem',
                    width: '100%',
                    maxWidth: '450px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <h1 style={{ margin: 0, textAlign: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                    EduGen <span style={{ color: 'var(--accent-color)' }}>AI</span>
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '-0.5rem 0 1rem', fontSize: '1.1rem' }}>
                    Your Intelligent Infinite Notebook
                </p>

                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#93c5fd', fontSize: '0.9rem', fontWeight: 'bold' }}>How to use EduGen:</p>
                    <ol style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    </ol>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#e2e8f0' }}>Enter your name to begin session</label>
                    <input
                        type="text"
                        className="input-primary"
                        placeholder="E.g. Akash..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ fontSize: '1.1rem', padding: '1rem' }}
                    />
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                    Launch AI Canvas
                </button>
            </form>
        </div>
    );
}
