'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Authentication failed. Please check your credentials.');
            } else {
                router.push('/admin');
                router.refresh();
            }
        } catch {
            setError('A network error occurred. Please verify connectivity and try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: '24px',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '36px 32px',
                boxShadow: 'var(--shadow-sm)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        margin: '0 auto 14px',
                        background: 'var(--accent-primary-bg)',
                        border: '1px solid var(--accent-primary-border)',
                        color: 'var(--accent-primary)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        letterSpacing: '0.05em',
                    }}>
                        MIT
                    </div>
                    <h1 style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--text-heading)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                    }}>
                        Hostel Administration Portal
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        marginTop: '6px',
                    }}>
                        Authorized wardens and administrative staff only
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}>
                            Administrator Password
                        </label>
                        <input
                            id="admin-password"
                            type="password"
                            className="input"
                            placeholder="Enter administrative password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            autoComplete="current-password"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--accent-danger-bg)',
                            border: '1px solid var(--accent-danger-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                            marginBottom: '16px',
                            fontSize: '13px',
                            color: 'var(--accent-danger)',
                            lineHeight: 1.4,
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="admin-login-btn"
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !password}
                        style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
                    >
                        {loading ? <><span className="spinner" /> Verifying Credentials...</> : 'Authenticate & Sign In'}
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    textAlign: 'center',
                }}>
                    <a href="/" style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                    }}>
                        &larr; Return to University Portal
                    </a>
                </div>
            </div>

            <div style={{
                marginTop: '24px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
            }}>
                Manipal Academy of Higher Education &bull; Manipal Institute of Technology
            </div>
        </div>
    );
}
