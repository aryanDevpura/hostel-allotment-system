'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DEPARTMENTS = [
    'AE', 'AT', 'BT', 'CE', 'CH', 'CHE', 'CS', 'CSE', 'CSBS', 'CV', 'DS',
    'EC', 'ECE', 'EE', 'EEE', 'EI', 'ENI', 'ICE', 'IE', 'IS', 'IT',
    'IM', 'MA', 'ME', 'MT', 'PE', 'PH', 'PI', 'TT',
];

// ─── Client-side validators ───────────────────────────────────────────────────
const validate = {
    regNo:  v => /^\d{9}$/.test(v.trim()),
    name:   v => /^[a-zA-Z][a-zA-Z\s]{1,49}$/.test(v.trim()) && v.trim().split(/\s+/).length >= 2,
    cgpa:   v => { const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 10 && /^\d+(\.\d{1,2})?$/.test(v); },
    password: v => v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v),
    confirmPassword: (v, pw) => v.length > 0 && v === pw,
};

const hints = {
    regNo: '9-digit numeric university registration number',
    name:  'First and last name (letters only)',
    cgpa:  'Cumulative GPA from 0.00 to 10.00',
    password: 'Minimum 8 characters with at least 1 letter and 1 number',
    confirmPassword: 'Must match password exactly',
};

const errorMsgs = {
    regNo: 'Registration number must be exactly 9 digits',
    name:  'Please enter your full name (minimum 2 words, letters only)',
    cgpa:  'CGPA must be a valid decimal between 0.00 and 10.00',
    password: 'Password requires at least 8 characters with letters and numbers',
    confirmPassword: 'Passwords do not match',
};

function pwStrength(v) {
    if (!v) return 0;
    const len = v.length >= 8;
    const letter = /[a-zA-Z]/.test(v);
    const num = /\d/.test(v);
    const special = /[^a-zA-Z0-9]/.test(v);
    if (!len) return 1;
    if (len && letter && num && special) return 3;
    if (len && letter && num) return 2;
    return 1;
}
const strengthMeta = [null, { label: 'Weak', color: '#dc2626' }, { label: 'Fair', color: '#d97706' }, { label: 'Strong', color: '#16a34a' }];

function FieldError({ show, msg }) {
    if (!show) return null;
    return (
        <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', padding: '3px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
            {msg}
        </div>
    );
}

function fieldBorder(valid, touched, value) {
    if (!touched || !value) return {};
    return {
        borderColor: valid ? '#16a34a' : '#dc2626',
        boxShadow: valid ? '0 0 0 2px rgba(22, 163, 74, 0.1)' : '0 0 0 2px rgba(220, 38, 38, 0.1)',
    };
}

export default function StudentLoginPage() {
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    // Login
    const [loginRegNo, setLoginRegNo] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register state
    const [f, setF] = useState({ regNo: '', name: '', gender: '', year: '', department: '', cgpa: '', password: '', confirmPassword: '' });
    const [t, setT] = useState({}); // touched

    const upd = (key, val) => setF(prev => ({ ...prev, [key]: val }));
    const touch = key => setT(prev => ({ ...prev, [key]: true }));
    const touchAll = () => setT({ regNo: true, name: true, gender: true, year: true, department: true, cgpa: true, password: true, confirmPassword: true });

    const isValid = {
        regNo: validate.regNo(f.regNo),
        name: validate.name(f.name),
        cgpa: validate.cgpa(f.cgpa),
        password: validate.password(f.password),
        confirmPassword: validate.confirmPassword(f.confirmPassword, f.password),
        gender: !!f.gender,
        year: !!f.year,
        department: !!f.department,
    };
    const allValid = Object.values(isValid).every(Boolean);
    const completedCount = Object.values(isValid).filter(Boolean).length;
    const totalFields = 8;

    const strength = pwStrength(f.password);
    const sm = strengthMeta[strength];

    function resetMessages() { setError(''); setSuccess(''); }
    function switchTab(newTab) { resetMessages(); setT({}); setTab(newTab); }

    async function handleLogin(e) {
        e.preventDefault();
        resetMessages();
        const cleaned = loginRegNo.trim();
        if (!cleaned || !loginPassword) { setError('Both Registration Number and Password are required.'); return; }
        if (!/^\d{9}$/.test(cleaned)) { setError('Registration number must be exactly 9 digits.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regNo: cleaned, password: loginPassword }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Authentication failed. Please verify credentials.'); return; }
            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('studentData', JSON.stringify(data.student));
            router.push('/student/dashboard');
        } catch { setError('Network connectivity error. Please try again.'); }
        finally { setLoading(false); }
    }

    async function handleRegister(e) {
        e.preventDefault();
        resetMessages();
        touchAll();
        if (!allValid) { setError('Please review and resolve the highlighted form fields before submitting.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    regNo: f.regNo.trim(),
                    name: f.name.trim(),
                    gender: f.gender,
                    year: parseInt(f.year),
                    department: f.department,
                    cgpa: parseFloat(f.cgpa),
                    password: f.password,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('studentData', JSON.stringify(data.student));
            setSuccess('Registration successful. Redirecting to student dashboard...');
            setTimeout(() => router.push('/student/dashboard'), 1200);
        } catch { setError('Network connectivity error. Please try again.'); }
        finally { setLoading(false); }
    }

    return (
        <div className="s-auth-container">
            <div className="s-auth-box">
                {/* Header */}
                <div className="s-auth-logo">
                    <div style={{
                        width: '44px',
                        height: '44px',
                        margin: '0 auto 12px',
                        background: 'var(--s-blue-subtle)',
                        border: '1px solid var(--s-blue-border)',
                        color: 'var(--s-blue)',
                        borderRadius: 'var(--s-radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                    }}>
                        MIT
                    </div>
                    <h2>Hostel Student Portal</h2>
                    <p>Directorate of Student Affairs &bull; Manipal Institute of Technology</p>
                </div>

                {/* Tabs */}
                <div className="s-tabs">
                    <button
                        type="button"
                        className={`s-tab ${tab === 'login' ? 'active' : ''}`}
                        onClick={() => switchTab('login')}
                    >
                        Student Sign In
                    </button>
                    <button
                        type="button"
                        className={`s-tab ${tab === 'register' ? 'active' : ''}`}
                        onClick={() => switchTab('register')}
                    >
                        New Registration
                    </button>
                </div>

                {/* ══════════ LOGIN ══════════ */}
                {tab === 'login' && (
                    <div className="s-card">
                        <form onSubmit={handleLogin} noValidate>
                            <div className="s-form-group">
                                <label className="s-label">Student Registration Number</label>
                                <input
                                    className="s-input"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter 9-digit registration number (e.g. 210905001)"
                                    value={loginRegNo}
                                    onChange={e => setLoginRegNo(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                    autoComplete="username"
                                    maxLength={9}
                                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--s-text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Exact 9 digits required</span>
                                    <span>{loginRegNo.length}/9 digits</span>
                                </div>
                            </div>

                            <div className="s-form-group">
                                <label className="s-label">Password</label>
                                <input
                                    className="s-input"
                                    type="password"
                                    placeholder="Enter your account password"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>

                            {error && <div className="s-alert s-alert-error">{error}</div>}

                            <button className="s-btn s-btn-primary s-btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '12px' }}>
                                {loading ? <><span className="s-spinner" /> Authenticating...</> : 'Sign In to Portal'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ══════════ REGISTER ══════════ */}
                {tab === 'register' && (
                    <div className="s-card">
                        {/* Progress bar */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--s-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Form Verification</span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: completedCount === totalFields ? 'var(--s-green)' : 'var(--s-text-muted)' }}>
                                    {completedCount} of {totalFields} fields validated
                                </span>
                            </div>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(completedCount / totalFields) * 100}%`, background: completedCount === totalFields ? 'var(--s-green)' : 'var(--s-blue)', transition: 'width 0.3s ease' }} />
                            </div>
                        </div>

                        <form onSubmit={handleRegister} noValidate>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                {/* Full Name */}
                                <div className="s-form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="s-label">Full Name</label>
                                    <input
                                        className="s-input"
                                        type="text"
                                        placeholder="Full legal name (e.g. Rahul Sharma)"
                                        value={f.name}
                                        onChange={e => upd('name', e.target.value)}
                                        onBlur={() => touch('name')}
                                        style={fieldBorder(isValid.name, t.name, f.name)}
                                    />
                                    <FieldError show={t.name && !isValid.name} msg={errorMsgs.name} />
                                </div>

                                {/* Reg No */}
                                <div className="s-form-group">
                                    <label className="s-label">Registration No</label>
                                    <input
                                        className="s-input"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="9 digits (e.g. 210905001)"
                                        value={f.regNo}
                                        onChange={e => upd('regNo', e.target.value.replace(/\D/g, '').slice(0, 9))}
                                        onBlur={() => touch('regNo')}
                                        maxLength={9}
                                        style={{ fontFamily: 'monospace', ...fieldBorder(isValid.regNo, t.regNo, f.regNo) }}
                                    />
                                    <FieldError show={t.regNo && !isValid.regNo} msg={errorMsgs.regNo} />
                                </div>

                                {/* Gender */}
                                <div className="s-form-group">
                                    <label className="s-label">Gender</label>
                                    <select
                                        className="s-input s-select"
                                        value={f.gender}
                                        onChange={e => upd('gender', e.target.value)}
                                        onBlur={() => touch('gender')}
                                        style={fieldBorder(isValid.gender, t.gender, f.gender)}
                                    >
                                        <option value="">Select Gender...</option>
                                        <option value="MALE">Male (Boys Blocks)</option>
                                        <option value="FEMALE">Female (Girls Blocks)</option>
                                    </select>
                                    <FieldError show={t.gender && !isValid.gender} msg="Gender selection is required" />
                                </div>

                                {/* Academic Year */}
                                <div className="s-form-group">
                                    <label className="s-label">Academic Year</label>
                                    <select
                                        className="s-input s-select"
                                        value={f.year}
                                        onChange={e => upd('year', e.target.value)}
                                        onBlur={() => touch('year')}
                                        style={fieldBorder(isValid.year, t.year, f.year)}
                                    >
                                        <option value="">Select Year...</option>
                                        <option value="2">Year 2 (Sophomore)</option>
                                        <option value="3">Year 3 (Junior)</option>
                                        <option value="4">Year 4 (Senior)</option>
                                    </select>
                                    <FieldError show={t.year && !isValid.year} msg="Study year is required" />
                                </div>

                                {/* Branch / Dept */}
                                <div className="s-form-group">
                                    <label className="s-label">Department</label>
                                    <select
                                        className="s-input s-select"
                                        value={f.department}
                                        onChange={e => upd('department', e.target.value)}
                                        onBlur={() => touch('department')}
                                        style={fieldBorder(isValid.department, t.department, f.department)}
                                    >
                                        <option value="">Select Branch...</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <FieldError show={t.department && !isValid.department} msg="Department branch is required" />
                                </div>

                                {/* Cumulative CGPA */}
                                <div className="s-form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="s-label">Cumulative GPA (CGPA)</label>
                                    <input
                                        className="s-input"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        placeholder="0.00 &ndash; 10.00 (e.g. 8.75)"
                                        value={f.cgpa}
                                        onChange={e => upd('cgpa', e.target.value)}
                                        onBlur={() => touch('cgpa')}
                                        style={fieldBorder(isValid.cgpa, t.cgpa, f.cgpa)}
                                    />
                                    <div style={{ fontSize: '11px', color: 'var(--s-text-muted)', marginTop: '2px' }}>{hints.cgpa}</div>
                                    <FieldError show={t.cgpa && !isValid.cgpa} msg={errorMsgs.cgpa} />
                                </div>

                                {/* Password */}
                                <div className="s-form-group">
                                    <label className="s-label">Create Password</label>
                                    <input
                                        className="s-input"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={f.password}
                                        onChange={e => upd('password', e.target.value)}
                                        onBlur={() => touch('password')}
                                        autoComplete="new-password"
                                        style={fieldBorder(isValid.password, t.password, f.password)}
                                    />
                                    {sm && (
                                        <div style={{ fontSize: '11px', color: sm.color, marginTop: '2px', fontWeight: 600 }}>
                                            Strength: {sm.label}
                                        </div>
                                    )}
                                    <FieldError show={t.password && !isValid.password} msg={errorMsgs.password} />
                                </div>

                                {/* Confirm Password */}
                                <div className="s-form-group">
                                    <label className="s-label">Confirm Password</label>
                                    <input
                                        className="s-input"
                                        type="password"
                                        placeholder="Re-enter password"
                                        value={f.confirmPassword}
                                        onChange={e => upd('confirmPassword', e.target.value)}
                                        onBlur={() => touch('confirmPassword')}
                                        autoComplete="new-password"
                                        style={fieldBorder(isValid.confirmPassword, t.confirmPassword, f.confirmPassword)}
                                    />
                                    <FieldError show={t.confirmPassword && !isValid.confirmPassword} msg={errorMsgs.confirmPassword} />
                                </div>
                            </div>

                            {error && <div className="s-alert s-alert-error">{error}</div>}
                            {success && <div className="s-alert s-alert-success">{success}</div>}

                            <button className="s-btn s-btn-primary s-btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '12px' }}>
                                {loading ? <><span className="s-spinner" /> Submitting Registration...</> : 'Complete Registration &rarr;'}
                            </button>
                        </form>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Link href="/student" style={{ fontSize: '12px', color: 'var(--s-text-muted)' }}>
                        &larr; Return to Student Portal Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
