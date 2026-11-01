'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { calculateFees } from '@/lib/fee-calculator';

export default function StudentDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blocksData, setBlocksData] = useState([]);

    // Group state
    const [inviteInput, setInviteInput] = useState('');
    const [groupAction, setGroupAction] = useState(''); // 'create' | 'join'
    const [groupMsg, setGroupMsg] = useState({ type: '', text: '' });
    const [groupBusy, setGroupBusy] = useState(false);

    // Preference state
    const [showPrefForm, setShowPrefForm] = useState(false);
    const [pref1BlockId, setPref1BlockId] = useState('');
    const [pref1RtId, setPref1RtId] = useState('');
    const [pref2BlockId, setPref2BlockId] = useState('');
    const [pref2RtId, setPref2RtId] = useState('');
    const [prefBusy, setPrefBusy] = useState(false);
    const [prefMsg, setPrefMsg] = useState({ type: '', text: '' });

    const pdfRef = useRef();
    const router = useRouter();

    const authHeader = () => {
        const token = localStorage.getItem('studentToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('studentToken');
        if (!token) { router.replace('/student/login'); return; }
        try {
            const res = await fetch('/api/student/me', { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401) { localStorage.removeItem('studentToken'); router.replace('/student/login'); return; }
            const json = await res.json();
            if (json.error) { setError(json.error); setLoading(false); return; }
            setData(json);
        } catch { setError('Failed to retrieve student profile.'); }
        finally { setLoading(false); }
    }, [router]);

    const fetchBlocks = useCallback(async () => {
        try {
            const res = await fetch('/api/student/blocks');
            const json = await res.json();
            setBlocksData(json.blocks || []);
        } catch { }
    }, []);

    useEffect(() => { fetchData(); fetchBlocks(); }, [fetchData, fetchBlocks]);

    async function createGroup() {
        setGroupBusy(true); setGroupMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/student/groups', { method: 'POST', headers: authHeader() });
            const json = await res.json();
            if (!res.ok) { setGroupMsg({ type: 'error', text: json.error }); return; }
            setGroupMsg({ type: 'success', text: `Group created successfully. Share invite code: ${json.inviteCode}` });
            await fetchData();
        } finally { setGroupBusy(false); }
    }

    async function joinGroup() {
        if (!inviteInput.trim()) { setGroupMsg({ type: 'error', text: 'Please enter a valid group invite code.' }); return; }
        setGroupBusy(true); setGroupMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/student/groups/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ inviteCode: inviteInput.trim().toUpperCase() }),
            });
            const json = await res.json();
            if (!res.ok) { setGroupMsg({ type: 'error', text: json.error }); return; }
            setGroupMsg({ type: 'success', text: json.message });
            setInviteInput('');
            await fetchData();
        } finally { setGroupBusy(false); }
    }

    async function leaveGroup() {
        if (!confirm('Confirm departure from this group? If you are the leader, the group will be dissolved for all members.')) return;
        setGroupBusy(true);
        try {
            const res = await fetch('/api/student/groups/leave', { method: 'DELETE', headers: authHeader() });
            const json = await res.json();
            setGroupMsg({ type: res.ok ? 'success' : 'error', text: json.message || json.error });
            if (res.ok) await fetchData();
        } finally { setGroupBusy(false); }
    }

    async function submitPreferences(submitLock) {
        if (!pref1BlockId || !pref1RtId || !pref2BlockId || !pref2RtId) {
            setPrefMsg({ type: 'error', text: 'Both Preference 1 and Preference 2 must be fully selected.' }); return;
        }
        setPrefBusy(true); setPrefMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/student/groups/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    pref1BlockId: parseInt(pref1BlockId), pref1RoomTypeId: parseInt(pref1RtId),
                    pref2BlockId: parseInt(pref2BlockId), pref2RoomTypeId: parseInt(pref2RtId),
                    submit: submitLock,
                }),
            });
            const json = await res.json();
            if (!res.ok) { setPrefMsg({ type: 'error', text: json.error }); return; }
            setPrefMsg({ type: 'success', text: json.message });
            if (submitLock) { setShowPrefForm(false); }
            await fetchData();
        } finally { setPrefBusy(false); }
    }

    async function logout() {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
        router.replace('/student/login');
    }

    if (loading) return (
        <div className="s-page">
            <div className="s-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <span className="s-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                    <p style={{ color: 'var(--s-text-muted)', marginTop: 14 }}>Authenticating student record...</p>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="s-page">
            <div className="s-container">
                <div className="s-alert s-alert-error" style={{ marginTop: '32px' }}>{error}</div>
                <button className="s-btn s-btn-ghost" style={{ marginTop: '16px' }} onClick={() => router.replace('/student/login')}>
                    &larr; Return to Sign In
                </button>
            </div>
        </div>
    );

    const { student, session, portalGroup, allotment } = data;
    const portalStatus = session.portalStatus;
    const allotmentStatus = session.allotmentStatus;
    const isOpen = portalStatus === 'OPEN';
    const isResultsReady = allotmentStatus === 'ROUND2_DONE' || allotmentStatus === 'ROUND1_LOCKED';
    const isLeader = portalGroup?.isLeader;

    const fees = (isResultsReady && allotment) ? calculateFees(allotment.block, allotment.roomTypeCode) : null;

    async function downloadPDF() {
        if (typeof window === 'undefined') return;
        const element = pdfRef.current;
        if (!element) return;
        
        element.style.display = 'block';

        const opt = {
            margin: 0.5,
            filename: `${student.regNo}_Hostel_Admission_Order.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        try {
            await window.html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF generation error:', err);
        } finally {
            element.style.display = 'none';
        }
    }

    // Gender filtered blocks
    const genderBlocks = blocksData.filter(b => b.gender === student.gender);

    const validRoomTypes = (blockId) => {
        const block = blocksData.find(b => b.id === parseInt(blockId));
        if (!block) return [];
        return block.roomTypeBreakdown.filter(rt => rt.capacity >= (portalGroup?.members?.length || 1));
    };

    return (
        <div className="s-page">
            {/* Navbar */}
            <nav className="s-nav">
                <Link href="/student" className="s-nav-brand">
                    <span className="s-nav-brand-badge">MIT</span>
                    Hostel Portal <span>&bull; Student Dashboard</span>
                </Link>
                <div className="s-nav-links">
                    <Link href="/student/blocks" className="s-nav-link">Hostel Inventory</Link>
                    <button className="s-nav-link" onClick={logout} style={{ color: '#fca5a5' }}>Sign Out</button>
                </div>
            </nav>

            <div className="s-container">
                {/* Student Profile Header */}
                <div className="s-card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: 'var(--s-radius)',
                                background: 'var(--s-blue-subtle)',
                                border: '1px solid var(--s-blue-border)',
                                color: 'var(--s-blue)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                fontWeight: 700,
                            }}>
                                {student.name[0]}
                            </div>
                            <div>
                                <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--s-text-primary)', marginBottom: '2px' }}>
                                    {student.name}
                                </h1>
                                <p style={{ color: 'var(--s-text-muted)', fontSize: '13px' }}>
                                    Reg No: <strong style={{ color: 'var(--s-text-primary)', fontFamily: 'monospace' }}>{student.regNo}</strong> &bull; Dept: <strong>{student.department}</strong> &bull; Year: <strong>{student.year}</strong> &bull; CGPA: <strong style={{ color: 'var(--s-blue)' }}>{student.cgpa}</strong>
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="s-badge s-badge-blue">
                                {student.gender === 'MALE' ? 'Eligible for Male Blocks' : 'Eligible for Female Blocks'}
                            </span>
                            <Link href="/student/blocks" className="s-btn s-btn-outline s-btn-sm">
                                View Campus Blocks
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Status Phase Banners */}
                {portalStatus === 'OPEN' && (
                    <div className="s-phase-banner s-phase-open">
                        <span>Application Window Active</span> &mdash; Student portal is currently accepting group formation and block preferences.
                    </div>
                )}
                {portalStatus === 'LOCKED' && !isResultsReady && (
                    <div className="s-phase-banner s-phase-locked">
                        <span>Applications Locked</span> &mdash; Applications are closed. The allotment algorithm is being processed by administration.
                    </div>
                )}
                {portalStatus === 'CLOSED' && (
                    <div className="s-phase-banner s-phase-closed">
                        <span>Portal Closed</span> &mdash; Applications are not active at this time. Please check published institutional schedules.
                    </div>
                )}
                {isResultsReady && allotment && (
                    <div className="s-phase-banner s-phase-results">
                        <span>Official Allotment Published</span> &mdash; Your accommodation assignment has been confirmed. Review order details below.
                    </div>
                )}

                {/* ===== ALLOTMENT RESULT ===== */}
                {isResultsReady && allotment && (
                    <div className="s-card" style={{ marginBottom: '20px' }}>
                        <div className="s-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="s-card-title">Confirmed Room Assignment</span>
                                <span className="s-badge s-badge-green">Round {allotment.round} Confirmed</span>
                            </div>
                            <button onClick={downloadPDF} className="s-btn s-btn-primary s-btn-sm">
                                Download Admission Order (PDF)
                            </button>
                        </div>

                        <div className="s-result-card">
                            <div className="s-result-label">Assigned Hostel Building</div>
                            <div className="s-result-block-num">Block {allotment.block}</div>

                            <div className="s-result-grid">
                                <div className="s-result-cell">
                                    <div className="s-result-label">Room Number</div>
                                    <div className="s-result-value">{allotment.roomNumber}</div>
                                </div>
                                <div className="s-result-cell">
                                    <div className="s-result-label">Floor Level</div>
                                    <div className="s-result-value">Floor {allotment.floor}</div>
                                </div>
                                <div className="s-result-cell">
                                    <div className="s-result-label">Room Type</div>
                                    <div className="s-result-value">{allotment.roomType}</div>
                                </div>
                            </div>
                        </div>

                        {allotment.roommates?.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--s-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Assigned Roommates
                                </div>
                                {allotment.roommates.map((r, i) => (
                                    <div key={i} className="s-member-card">
                                        <div className="s-member-avatar">{r.name[0]}</div>
                                        <div className="s-member-info">
                                            <div className="s-member-name">{r.name}</div>
                                            <div className="s-member-meta">Reg: {r.regNo} &bull; Dept: {r.department} &bull; Year {r.year}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {isResultsReady && !allotment && (
                    <div className="s-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Off-Campus Designation</h3>
                        <p style={{ color: 'var(--s-text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto' }}>
                            Based on your preference selections and queue merit ranking, on-campus accommodation could not be allocated in this session. Please contact the Chief Warden&apos;s Office for waitlist inquiries.
                        </p>
                    </div>
                )}

                {/* ===== GROUP FORMATION (portal open only) ===== */}
                {isOpen && !portalGroup && (
                    <div className="s-card">
                        <div className="s-card-header">
                            <span className="s-card-title">Roommate Group Configuration</span>
                            <span className="s-badge s-badge-amber">Individual Applicant</span>
                        </div>
                        <p style={{ color: 'var(--s-text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
                            You may apply individually as a solo candidate or form a group of 2 to 3 students. Group priority is determined by the mean CGPA of all members.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                            <div
                                style={{
                                    padding: '16px',
                                    border: `1px solid ${groupAction === 'create' ? 'var(--s-blue)' : 'var(--s-border)'}`,
                                    background: groupAction === 'create' ? 'var(--s-blue-subtle)' : '#ffffff',
                                    borderRadius: 'var(--s-radius)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setGroupAction('create')}
                            >
                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Create New Group</div>
                                <div style={{ fontSize: '12px', color: 'var(--s-text-muted)' }}>Generate an invite code and act as the designated group leader.</div>
                            </div>

                            <div
                                style={{
                                    padding: '16px',
                                    border: `1px solid ${groupAction === 'join' ? 'var(--s-blue)' : 'var(--s-border)'}`,
                                    background: groupAction === 'join' ? 'var(--s-blue-subtle)' : '#ffffff',
                                    borderRadius: 'var(--s-radius)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setGroupAction('join')}
                            >
                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Join Existing Group</div>
                                <div style={{ fontSize: '12px', color: 'var(--s-text-muted)' }}>Enter an invite code provided by your peer group leader.</div>
                            </div>
                        </div>

                        {groupAction === 'create' && (
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 'var(--s-radius)', border: '1px solid var(--s-border)' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Initiate Group as Leader</h4>
                                <p style={{ fontSize: '12px', color: 'var(--s-text-muted)', marginBottom: '14px' }}>
                                    As group leader, you will be responsible for defining and locking Preference 1 and Preference 2 for your group.
                                </p>
                                <button className="s-btn s-btn-primary" onClick={createGroup} disabled={groupBusy}>
                                    {groupBusy ? <><span className="s-spinner" /> Generating Code...</> : 'Create Group &amp; Generate Invite Code'}
                                </button>
                            </div>
                        )}

                        {groupAction === 'join' && (
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 'var(--s-radius)', border: '1px solid var(--s-border)' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Enter Peer Invite Code</h4>
                                <p style={{ fontSize: '12px', color: 'var(--s-text-muted)', marginBottom: '14px' }}>
                                    Group members must share the same gender. Joining associates your academic record with the group.
                                </p>
                                <div style={{ display: 'flex', gap: '8px', maxWidth: '380px' }}>
                                    <input
                                        className="s-input"
                                        placeholder="Invite Code (e.g. XC9-2B4)"
                                        value={inviteInput}
                                        onChange={e => setInviteInput(e.target.value.toUpperCase())}
                                        style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                                    />
                                    <button className="s-btn s-btn-primary" onClick={joinGroup} disabled={groupBusy}>
                                        {groupBusy ? <span className="s-spinner" /> : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {groupMsg.text && <div className={`s-alert s-alert-${groupMsg.type}`} style={{ marginTop: '12px' }}>{groupMsg.text}</div>}
                    </div>
                )}

                {/* ===== CURRENT GROUP ===== */}
                {portalGroup && (
                    <div className="s-card">
                        <div className="s-card-header">
                            <span className="s-card-title">Active Roommate Group</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {isLeader && <span className="s-badge s-badge-blue">Group Leader</span>}
                                {portalGroup.isSubmitted
                                    ? <span className="s-badge s-badge-green">Preferences Submitted &amp; Locked</span>
                                    : <span className="s-badge s-badge-amber">Draft Pending Submission</span>}
                            </div>
                        </div>

                        {/* Invite Code (if not submitted and is leader) */}
                        {isLeader && !portalGroup.isSubmitted && isOpen && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--s-text-muted)', marginBottom: '4px' }}>
                                    Group Invite Code (share with up to 2 peers):
                                </div>
                                <div className="s-invite-code">{portalGroup.inviteCode}</div>
                            </div>
                        )}

                        {/* Group Stats */}
                        <div className="s-stats-row">
                            <div className="s-stat">
                                <div className="s-stat-value">{portalGroup.members.length} / 3</div>
                                <div className="s-stat-label">Confirmed Members</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{portalGroup.avgCgpa || '—'}</div>
                                <div className="s-stat-label">Calculated Mean CGPA</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">Year {portalGroup.priorityYear || '—'}</div>
                                <div className="s-stat-label">Priority Seniority Year</div>
                            </div>
                        </div>

                        {/* Member Roster */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--s-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                Confirmed Members
                            </div>
                            {portalGroup.members.map(m => (
                                <div key={m.id} className="s-member-card">
                                    <div className="s-member-avatar">{m.name[0]}</div>
                                    <div className="s-member-info">
                                        <div className="s-member-name">{m.name}</div>
                                        <div className="s-member-meta">Reg: {m.regNo} &bull; Dept: {m.department} &bull; Year {m.year} &bull; CGPA: {m.cgpa}</div>
                                    </div>
                                    {m.id === student.id && <span className="s-badge s-badge-gray">You</span>}
                                    {portalGroup.isLeader && m.id === student.id && <span className="s-badge s-badge-blue">Leader</span>}
                                </div>
                            ))}
                        </div>

                        {/* Preferences Display */}
                        {portalGroup.pref1 && (
                            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: 'var(--s-radius)', border: '1px solid var(--s-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: 'var(--s-text-primary)' }}>Saved Preferences</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    <div style={{ padding: '14px', background: '#ffffff', border: '1px solid var(--s-border)', borderRadius: 'var(--s-radius-sm)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preference 1 (Primary)</div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--s-text-primary)', marginTop: '4px' }}>Block {portalGroup.pref1.block.number}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--s-text-muted)', marginTop: '2px' }}>{portalGroup.pref1.roomType?.name}</div>
                                    </div>
                                    {portalGroup.pref2 && (
                                        <div style={{ padding: '14px', background: '#ffffff', border: '1px solid var(--s-border)', borderRadius: 'var(--s-radius-sm)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preference 2 (Secondary)</div>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--s-text-primary)', marginTop: '4px' }}>Block {portalGroup.pref2.block.number}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--s-text-muted)', marginTop: '2px' }}>{portalGroup.pref2.roomType?.name}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Preference Form */}
                        {isLeader && isOpen && !portalGroup.isSubmitted && (
                            <>
                                <button className="s-btn s-btn-outline s-btn-sm" onClick={() => setShowPrefForm(v => !v)} style={{ marginBottom: showPrefForm ? '14px' : '0' }}>
                                    {showPrefForm ? 'Hide Form' : (portalGroup.pref1 ? 'Edit Preferences' : 'Configure Block Preferences')}
                                </button>

                                {showPrefForm && (
                                    <div style={{ padding: '18px', background: '#f8fafc', borderRadius: 'var(--s-radius)', border: '1px solid var(--s-border)', marginTop: '8px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                            {/* Pref 1 */}
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--s-blue)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Preference 1 Choice</div>
                                                <div className="s-form-group">
                                                    <label className="s-label">Block</label>
                                                    <select className="s-input s-select" value={pref1BlockId} onChange={e => { setPref1BlockId(e.target.value); setPref1RtId(''); }}>
                                                        <option value="">Choose Block...</option>
                                                        {genderBlocks.map(b => <option key={b.id} value={b.id}>Block {b.number} ({b.totalBeds} beds)</option>)}
                                                    </select>
                                                </div>
                                                <div className="s-form-group">
                                                    <label className="s-label">Room Type</label>
                                                    <select className="s-input s-select" value={pref1RtId} onChange={e => setPref1RtId(e.target.value)} disabled={!pref1BlockId}>
                                                        <option value="">Choose Room Type...</option>
                                                        {validRoomTypes(pref1BlockId).map(rt => <option key={rt.id} value={rt.id}>{rt.name} (Cap: {rt.capacity})</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Pref 2 */}
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--s-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Preference 2 Choice</div>
                                                <div className="s-form-group">
                                                    <label className="s-label">Block</label>
                                                    <select className="s-input s-select" value={pref2BlockId} onChange={e => { setPref2BlockId(e.target.value); setPref2RtId(''); }}>
                                                        <option value="">Choose Block...</option>
                                                        {genderBlocks.map(b => <option key={b.id} value={b.id}>Block {b.number} ({b.totalBeds} beds)</option>)}
                                                    </select>
                                                </div>
                                                <div className="s-form-group">
                                                    <label className="s-label">Room Type</label>
                                                    <select className="s-input s-select" value={pref2RtId} onChange={e => setPref2RtId(e.target.value)} disabled={!pref2BlockId}>
                                                        <option value="">Choose Room Type...</option>
                                                        {validRoomTypes(pref2BlockId).map(rt => <option key={rt.id} value={rt.id}>{rt.name} (Cap: {rt.capacity})</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="s-btn s-btn-ghost" onClick={() => submitPreferences(false)} disabled={prefBusy}>
                                                {prefBusy ? <span className="s-spinner" /> : 'Save Draft Preferences'}
                                            </button>
                                            <button className="s-btn s-btn-primary" onClick={() => submitPreferences(true)} disabled={prefBusy}>
                                                {prefBusy ? <span className="s-spinner" /> : 'Submit &amp; Lock Preferences'}
                                            </button>
                                        </div>
                                        {prefMsg.text && <div className={`s-alert s-alert-${prefMsg.type}`} style={{ marginTop: '10px' }}>{prefMsg.text}</div>}
                                    </div>
                                )}
                            </>
                        )}

                        {!isLeader && isOpen && !portalGroup.isSubmitted && (
                            <div className="s-alert s-alert-info" style={{ marginTop: '12px' }}>
                                Notice: Only the registered group leader can configure and lock preferences for this application group.
                            </div>
                        )}

                        {isOpen && !portalGroup.isSubmitted && (
                            <>
                                <hr className="s-divider" />
                                <button className="s-btn s-btn-danger s-btn-sm" onClick={leaveGroup} disabled={groupBusy}>
                                    {isLeader ? 'Dissolve Group' : 'Leave Group'}
                                </button>
                                {groupMsg.text && <div className={`s-alert s-alert-${groupMsg.type}`} style={{ marginTop: '10px' }}>{groupMsg.text}</div>}
                            </>
                        )}
                    </div>
                )}

                {/* When portal is closed and no group */}
                {!portalGroup && !isOpen && !isResultsReady && (
                    <div className="s-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Application Window Inactive</h3>
                        <p style={{ color: 'var(--s-text-muted)', fontSize: '13px' }}>
                            Preference submissions are closed. You can inspect <Link href="/student/blocks" style={{ color: 'var(--s-blue)' }}>campus blocks</Link> while awaiting the next allotment cycle.
                        </p>
                    </div>
                )}
            </div>

            {/* Hidden Printable Official PDF Template */}
            {isResultsReady && allotment && fees && (
                <div style={{ display: 'none' }}>
                    <div ref={pdfRef} style={{ padding: '40px', fontFamily: '"Arial", sans-serif', color: '#000', backgroundColor: '#fff', width: '800px' }}>
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Manipal Institute of Technology</h1>
                            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'normal', color: '#444' }}>Hostel Management System</h2>
                            <h3 style={{ fontSize: '20px', margin: '16px 0 0 0', textDecoration: 'underline' }}>PROVISIONAL HOSTEL ADMISSION ORDER</h3>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '14px' }}>
                            <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
                            <div><strong>Academic Year:</strong> 2026-27</div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '16px', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Student Details</h4>
                            <table style={{ width: '100%', fontSize: '14px', lineHeight: '2' }}>
                                <tbody>
                                    <tr><td style={{ width: '30%' }}><strong>Registration Number:</strong></td><td>{student.regNo}</td></tr>
                                    <tr><td><strong>Name:</strong></td><td>{student.name}</td></tr>
                                    <tr><td><strong>Department:</strong></td><td>{student.department}</td></tr>
                                    <tr><td><strong>Year of Study:</strong></td><td>{student.year}</td></tr>
                                    <tr><td><strong>Gender:</strong></td><td>{student.gender}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '16px', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Allotment Details</h4>
                            <table style={{ width: '100%', fontSize: '14px', lineHeight: '2' }}>
                                <tbody>
                                    <tr><td style={{ width: '30%' }}><strong>Block Number:</strong></td><td>Block {allotment.block}</td></tr>
                                    <tr><td><strong>Room Number:</strong></td><td>{allotment.roomNumber} (Floor {allotment.floor})</td></tr>
                                    <tr><td><strong>Room Type:</strong></td><td>{allotment.roomType} ({allotment.roomTypeCode})</td></tr>
                                    <tr><td><strong>Allotment Round:</strong></td><td>Round {allotment.round}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ fontSize: '16px', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Fee Breakdown</h4>
                            {fees ? (
                                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc' }}>Annual Hostel Facilities Fee</td>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>₹{fees.facilitiesFee.toLocaleString('en-IN')}</td>
                                        </tr>
                                        {fees.acElectricityAdvance > 0 && (
                                            <tr>
                                                <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc' }}>AC Electricity Advance</td>
                                                <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>₹{fees.acElectricityAdvance.toLocaleString('en-IN')}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc' }}>Hostel Deposit (Refundable)</td>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>₹{fees.hostelDeposit.toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc' }}>Mess Advance</td>
                                            <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>₹{fees.messAdvance.toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px 0', borderBottom: '2px solid #000', fontWeight: 'bold' }}>Total Amount Payable</td>
                                            <td style={{ padding: '12px 0', borderBottom: '2px solid #000', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>₹{fees.totalAmount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: '#888', fontSize: '13px' }}>Fee details are not available for this room type. Please contact the Hostel Office.</p>
                            )}
                        </div>

                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.6', marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <p><strong>Remarks:</strong></p>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>This admission order is provisional and subject to successful payment of the Total Amount Payable within 7 working days.</li>
                                <li>In case of cancellation or no-show, the Hostel Deposit and Mess Advance will be refunded within 30 days as per university policy.</li>
                                <li>The allotted room is strictly non-transferable.</li>
                                <li>Please bring a printed copy of this Admission Order along with your Student ID card at the time of hostel check-in.</li>
                            </ol>
                        </div>
                        
                        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '8px', width: '200px' }}>Student Signature</div>
                            <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '8px', width: '200px' }}>Chief Warden Signature</div>
                        </div>
                    </div>
                </div>
            )}
            
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" />
        </div>
    );
}
