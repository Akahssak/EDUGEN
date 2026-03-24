import React from 'react';

export function AiResponseOverlay({ isAnalyzing, error }: { isAnalyzing: boolean; error: string | null }) {
    if (!isAnalyzing && !error) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999
        }}>
            {isAnalyzing && (
                <div style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '1rem 2rem',
                    borderRadius: '99px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="spinner" style={{
                        width: '20px', height: '20px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing your notes...
                </div>
            )}
            {error && (
                <div style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    {error}
                </div>
            )}
            <style>
                {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
            </style>
        </div>
    );
}
