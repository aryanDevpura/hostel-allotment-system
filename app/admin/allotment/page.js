'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AllotmentPage() {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [roundStats, setRoundStats] = useState(null);
    const [error, setError] = useState('');
    const [algoMode, setAlgoMode] = useState('preference_only');
    const [portalBusy, setPortalBusy] = useState(false);

    // Verification panel state
    const [r1Allotments, setR1Allotments] = useState([]);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [disallowing, setDisallowing] = useState(null); // allotment ID being disallowed

    // Filter & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBlock, setFilterBlock] = useState('ALL');
    const [filterPlacedBy, setFilterPlacedBy] = useState('ALL');
    const [filterRoomType, setFilterRoomType] = useState('ALL');
    const [sortBy, setSortBy] = useState('block-room');

    // Algorithm Rules state
    const [blockCutoffsEnabled, setBlockCutoffsEnabled] = useState(false);
    const [maxCgpaDiffEnabled, setMaxCgpaDiffEnabled] = useState(false);
    const [maxCgpaDiff, setMaxCgpaDiff] = useState('');
    const [blockRows, setBlockRows] = useState([]); // [{id, number, gender, minCgpa}]
    const [rulesSaving, setRulesSaving] = useState(false);
    const [rulesSaved, setRulesSaved] = useState(false);

    // Audit Logs state
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [auditSetupMsg, setAuditSetupMsg] = useState('');
    const [auditSetupBusy, setAuditSetupBusy] = useState(false);

    useEffect(() => { 
        fetchSessions(); 
        fetchAuditLogs();
    }, []);

    async function fetchAuditLogs() {
        setAuditLogsLoading(true);
        try {
            const res = await fetch('/api/admin/audit-logs');
            const data = await res.json();
            setAuditLogs(data.logs || []);
            if (data.warning && !auditSetupMsg) {
                setAuditSetupMsg(data.warning);
            }
        } catch {
            // non-critical
        } finally {
            setAuditLogsLoading(false);
        }
    }

    async function setupAuditLog() {
        setAuditSetupBusy(true);
        setAuditSetupMsg('');
        try {
            const res = await fetch('/api/admin/setup-audit-log', { method: 'POST' });
            const data = await res.json();
            if (data.error) {
                setAuditSetupMsg(data.error);
            } else {
                setAuditSetupMsg(data.message);
                await fetchAuditLogs();
            }
        } catch (err) {
            setAuditSetupMsg('Network error: ' + err.message);
        } finally {
            setAuditSetupBusy(false);
        }
    }

    async function fetchSettings(sessionId) {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/settings`);
            const data = await res.json();
            setBlockCutoffsEnabled(data.blockCutoffsEnabled || false);
            setMaxCgpaDiffEnabled(data.maxCgpaDiffEnabled || false);
            setMaxCgpaDiff(data.maxCgpaDiff ?? '');
            setBlockRows(data.blocks || []);
        } catch { /* non-critical */ }
    }

    async function saveSettings() {
        if (!selectedSession) return;
        setRulesSaving(true);
        setRulesSaved(false);
        try {
            const res = await fetch(`/api/sessions/${selectedSession.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blockCutoffsEnabled,
                    maxCgpaDiffEnabled,
                    maxCgpaDiff: maxCgpaDiff === '' ? null : parseFloat(maxCgpaDiff),
                    cutoffs: blockRows.map(b => ({ blockId: b.id, minCgpa: b.minCgpa })),
                }),
            });
            const data = await res.json();
            if (data.error) setError(data.error);
            else setRulesSaved(true);
        } catch (err) {
            setError('Failed to save rules: ' + err.message);
        } finally {
            setRulesSaving(false);
        }
    }

    async function fetchSessions() {
        try {
            const res = await fetch('/api/sessions');
            const data = await res.json();
            setSessions(data.sessions || []);
            const active = data.sessions?.find(s =>
                ['DRAFT', 'ROUND1_DONE', 'ROUND1_LOCKED'].includes(s.status)
            );
            if (active) {
                setSelectedSession(active);
                fetchSettings(active.id); // load settings for all active session states
            }
        } catch {
            setError('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }

    async function fetchR1Allotments(sessionId) {
        setVerifyLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/r1-allotments`);
            const data = await res.json();
            setR1Allotments(data.allotments || []);
        } catch {
            setError('Failed to load Round 1 allotments');
        } finally {
            setVerifyLoading(false);
        }
    }

    useEffect(() => {
        if (selectedSession?.status === 'ROUND1_DONE') {
            fetchR1Allotments(selectedSession.id);
        } else {
            setR1Allotments([]);
        }
    }, [selectedSession]);

    async function runRound(round) {
        if (!selectedSession) return;
        setRunning(true);
        setError('');
        setRoundStats(null);
        try {
            const res = await fetch('/api/allotment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: selectedSession.id, round, mode: algoMode }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setRoundStats(data);
                await fetchSessions();
            }
        } catch (err) {
            setError('Allotment failed: ' + err.message);
        } finally {
            setRunning(false);
        }
    }

    async function disallowAllotment(allotmentId, names) {
        if (!confirm(`Disallow allotment for: ${names}?\n\nThey will NOT be eligible for Round 2 and this room will become vacant.`)) return;
        setDisallowing(allotmentId);
        try {
            const res = await fetch(`/api/allotments/${allotmentId}/disallow`, { method: 'PATCH' });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                const disallowedGroupId = r1Allotments.find(a => a.id === allotmentId)?.groupId;
                setR1Allotments(prev => prev.filter(a => a.groupId !== disallowedGroupId));
            }
        } catch (err) {
            setError('Disallow failed: ' + err.message);
        } finally {
            setDisallowing(null);
        }
    }

    async function lockRound1() {
        if (!selectedSession) return;
        if (!confirm('Lock Round 1? No further manual disallowals can be made. Round 2 will become available for waitlisted applicants.')) return;
        setRunning(true);
        setError('');
        try {
            const res = await fetch(`/api/sessions/${selectedSession.id}/lock-round1`, { method: 'PATCH' });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                await fetchSessions();
            }
        } catch (err) {
            setError('Lock operation failed: ' + err.message);
        } finally {
            setRunning(false);
        }
    }

    async function setPortalStatus(status) {
        if (!selectedSession) return;
        
        let confirmMsg = `Are you sure you want to change student portal status to ${status} for session "${selectedSession.name}"?`;
        if (status === 'OPEN') {
            confirmMsg = `WARNING: Opening the student portal will reset existing student portal groups and preferences to ensure a clean application cycle.\n\nProceed?`;
        }

        if (!confirm(confirmMsg)) return;
        
        setPortalBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/sessions/${selectedSession.id}/portal`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portalStatus: status }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); } else { await fetchSessions(); }
        } catch (err) { setError('Portal status update failed: ' + err.message); }
        finally { setPortalBusy(false); }
    }

    async function resetSession() {
        if (!selectedSession) return;
        if (!confirm(`Reset session "${selectedSession.name}"? This will delete all generated allotment allocations. Student profiles and groups will be preserved.`)) return;
        setRunning(true);
        setError('');
        setRoundStats(null);
        try {
            const res = await fetch(`/api/sessions/${selectedSession.id}/reset`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) { setError(data.error); } else { await fetchSessions(); }
        } catch (err) { setError('Reset failed: ' + err.message); }
        finally { setRunning(false); }
    }

    async function deleteSession() {
        if (!selectedSession) return;
        if (!confirm(`PERMANENTLY DELETE session "${selectedSession.name}"? This action cannot be undone and deletes all related students, groups, and allocations.`)) return;
        setRunning(true);
        setError('');
        setRoundStats(null);
        try {
            const res = await fetch(`/api/sessions/${selectedSession.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) { setError(data.error); } else { setSelectedSession(null); setRoundStats(null); await fetchSessions(); }
        } catch (err) { setError('Delete failed: ' + err.message); }
        finally { setRunning(false); }
    }

    if (loading) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1>Allotment Processing Engine</h1>
                        <p>Loading active sessions...</p>
                    </div>
                </div>
                <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24 }} /></div>
            </div>
        );
    }

    const statusBadge = (status) => {
        const map = {
            DRAFT: 'badge-purple',
            ROUND1_DONE: 'badge-warning',
            ROUND1_LOCKED: 'badge-info',
            ROUND2_DONE: 'badge-success'
        };
        return <span className={`badge ${map[status] || 'badge-purple'}`}>{status.replace(/_/g, ' ')}</span>;
    };

    // Group allotments by groupId for display and apply filtering/sorting
    let displayGroups = Object.values(r1Allotments.reduce((acc, a) => {
        if (!acc[a.groupId]) acc[a.groupId] = [];
        acc[a.groupId].push(a);
        return acc;
    }, {}));

    // Filtering
    if (searchTerm) {
        const q = searchTerm.toLowerCase();
        displayGroups = displayGroups.filter(g => 
            g.some(a => a.student.name.toLowerCase().includes(q) || a.student.regNo.toLowerCase().includes(q))
        );
    }
    if (filterBlock !== 'ALL') {
        displayGroups = displayGroups.filter(g => g[0].room?.block?.number.toString() === filterBlock);
    }
    if (filterPlacedBy !== 'ALL') {
        displayGroups = displayGroups.filter(g => g[0].placedBy === filterPlacedBy);
    }
    if (filterRoomType !== 'ALL') {
        displayGroups = displayGroups.filter(g => g[0].room?.roomType?.code === filterRoomType);
    }

    // Sorting
    displayGroups.sort((gA, gB) => {
        const aFirst = gA[0];
        const bFirst = gB[0];
        if (sortBy === 'cgpa-desc') {
            const avgA = gA.reduce((s, a) => s + a.student.cgpa, 0) / gA.length;
            const avgB = gB.reduce((s, b) => s + b.student.cgpa, 0) / gB.length;
            return avgB - avgA;
        }
        if (sortBy === 'cgpa-asc') {
            const avgA = gA.reduce((s, a) => s + a.student.cgpa, 0) / gA.length;
            const avgB = gB.reduce((s, b) => s + b.student.cgpa, 0) / gB.length;
            return avgA - avgB;
        }
        if (sortBy === 'size-desc') {
            return gB.length - gA.length;
        }
        // Default: block-room
        if (aFirst.room?.block?.number !== bFirst.room?.block?.number) {
            return (aFirst.room?.block?.number || 0) - (bFirst.room?.block?.number || 0);
        }
        return (aFirst.room?.roomNumber || '').localeCompare(bFirst.room?.roomNumber || '');
    });

    const uniqueBlocks = [...new Set(r1Allotments.map(a => a.room?.block?.number).filter(Boolean))].sort((a, b) => a - b);
    const uniqueRoomTypes = [...new Set(r1Allotments.map(a => a.room?.roomType?.code).filter(Boolean))].sort();

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Allotment Processing Engine</h1>
                    <p>Execute and verify multi-round merit allocation algorithms for hostel rooms</p>
                </div>
            </div>

            {error && (
                <div className="error-list">
                    <h4>Action Notice</h4>
                    <p style={{ fontSize: '13px' }}>{error}</p>
                </div>
            )}

            {sessions.length === 0 ? (
                <div className="empty-state">
                    <h3>No Allotment Sessions Available</h3>
                    <p style={{ marginTop: '4px' }}>Please upload a student dataset CSV to create an allotment session.</p>
                    <div style={{ marginTop: '16px' }}>
                        <Link href="/admin/upload" className="btn btn-primary btn-sm">
                            Import Student CSV
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Session Selector Card */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div className="card-header">
                            <span className="card-title">Active Allotment Session Selection</span>
                            {selectedSession && statusBadge(selectedSession.status)}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                            <select
                                className="input"
                                value={selectedSession?.id || ''}
                                onChange={(e) => {
                                    const s = sessions.find(s => s.id === parseInt(e.target.value));
                                    setSelectedSession(s);
                                    setRoundStats(null);
                                    setError('');
                                    setRulesSaved(false);
                                    if (s) fetchSettings(s.id);
                                }}
                            >
                                <option value="">&mdash; Choose a session to manage &mdash;</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} &mdash; Status: {s.status.replace(/_/g, ' ')} ({s._count?.students || 0} students)
                                    </option>
                                ))}
                            </select>

                            {selectedSession && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={() => setPortalStatus(selectedSession.portalStatus === 'OPEN' ? 'LOCKED' : 'OPEN')}
                                        disabled={portalBusy}
                                    >
                                        Portal: {selectedSession.portalStatus === 'OPEN' ? 'Close Applications' : 'Open Applications'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedSession && (
                        <>
                            {/* ====== DRAFT: Algorithm Rules + Mode Selection + Run R1 ====== */}
                            {selectedSession.status === 'DRAFT' && (
                                <>
                                    {/* Algorithm Constraints Card */}
                                    <div className="card" style={{ marginBottom: '20px' }}>
                                        <div className="card-header">
                                            <span className="card-title">Allocation Rules &amp; Thresholds</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configured constraints apply to Round 1</span>
                                        </div>

                                        {/* Rule 1: Block CGPA Cutoffs */}
                                        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: blockCutoffsEnabled ? '14px' : '0' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '13px' }}>Enforce Minimum Block CGPA Cutoffs</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Prevent applicants with merit scores below block cutoffs from being allotted to premium blocks.</div>
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={blockCutoffsEnabled}
                                                        onChange={e => setBlockCutoffsEnabled(e.target.checked)}
                                                    />
                                                    <span>{blockCutoffsEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </label>
                                            </div>

                                            {blockCutoffsEnabled && (
                                                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#ffffff' }}>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Block</th>
                                                                <th>Gender</th>
                                                                <th>Minimum CGPA Cutoff Threshold</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {blockRows.map(b => (
                                                                <tr key={b.id}>
                                                                    <td style={{ fontWeight: 600 }}>Block {b.number}</td>
                                                                    <td>{b.gender}</td>
                                                                    <td>
                                                                        <input
                                                                            type="number" step="0.1" min="0" max="10"
                                                                            placeholder="None (0.0)"
                                                                            value={b.minCgpa ?? ''}
                                                                            onChange={e => setBlockRows(rows => rows.map(r => r.id === b.id ? { ...r, minCgpa: e.target.value === '' ? null : parseFloat(e.target.value) } : r))}
                                                                            className="input"
                                                                            style={{ maxWidth: '120px', padding: '4px 8px' }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Rule 2: Max CGPA Gap */}
                                        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '13px' }}>Maximum CGPA Disparity in Roommate Groups</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Restricts students from pairing when individual CGPA difference exceeds a policy ceiling.</div>
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={maxCgpaDiffEnabled}
                                                        onChange={e => setMaxCgpaDiffEnabled(e.target.checked)}
                                                    />
                                                    <span>{maxCgpaDiffEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </label>
                                            </div>

                                            {maxCgpaDiffEnabled && (
                                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Maximum allowable delta:</label>
                                                    <input
                                                        type="number" step="0.1" min="0.1" max="10"
                                                        placeholder="e.g. 1.0"
                                                        value={maxCgpaDiff}
                                                        onChange={e => setMaxCgpaDiff(e.target.value)}
                                                        className="input"
                                                        style={{ maxWidth: '90px', padding: '4px 8px' }}
                                                    />
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GPA points difference between highest and lowest member</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button className="btn btn-outline" onClick={saveSettings} disabled={rulesSaving}>
                                                {rulesSaving ? <><span className="spinner" /> Saving Rules...</> : 'Save Threshold Settings'}
                                            </button>
                                            {rulesSaved && <span style={{ color: 'var(--accent-success)', fontSize: '13px', fontWeight: 600 }}>Settings saved successfully.</span>}
                                        </div>
                                    </div>

                                    {/* Algorithm Mode Selection */}
                                    <div className="card" style={{ marginBottom: '20px' }}>
                                        <div className="card-header">
                                            <span className="card-title">Execution Mode &amp; Round 1 Launch</span>
                                            {statusBadge(selectedSession.status)}
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                                            Select policy for processing applicants whose Preference 1 and Preference 2 cannot be satisfied:
                                        </p>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                                            <label style={{
                                                padding: '16px',
                                                border: `1px solid ${algoMode === 'preference_only' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                background: algoMode === 'preference_only' ? 'var(--accent-primary-bg)' : '#ffffff',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'block'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <input
                                                        type="radio"
                                                        name="algoMode"
                                                        value="preference_only"
                                                        checked={algoMode === 'preference_only'}
                                                        onChange={() => setAlgoMode('preference_only')}
                                                    />
                                                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-heading)' }}>Strict Preference Only</span>
                                                </div>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginLeft: '22px' }}>
                                                    Only allocates students who obtain their verified Pref 1 or Pref 2. All remaining students are waitlisted for manual review or Round 2.
                                                </p>
                                            </label>

                                            <label style={{
                                                padding: '16px',
                                                border: `1px solid ${algoMode === 'smart_vacancy' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                background: algoMode === 'smart_vacancy' ? 'var(--accent-primary-bg)' : '#ffffff',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'block'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <input
                                                        type="radio"
                                                        name="algoMode"
                                                        value="smart_vacancy"
                                                        checked={algoMode === 'smart_vacancy'}
                                                        onChange={() => setAlgoMode('smart_vacancy')}
                                                    />
                                                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-heading)' }}>Preference With Smart Vacancy Fill</span>
                                                </div>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginLeft: '22px' }}>
                                                    Attempts Pref 1 and 2 first. If full, immediately matches candidates with compatible remaining vacancies across blocks in CGPA order.
                                                </p>
                                            </label>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button className="btn btn-primary" onClick={() => runRound(1)} disabled={running}>
                                                {running ? <><span className="spinner" /> Executing Round 1...</> : 'Execute Round 1 Allotment'}
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={deleteSession} disabled={running} style={{ marginLeft: 'auto' }}>
                                                Delete Session
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ====== ROUND1_DONE: Verification Panel ====== */}
                            {selectedSession.status === 'ROUND1_DONE' && (
                                <div className="card animate-in" style={{ marginBottom: '20px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Round 1 Allotment Verification &amp; Clearance</span>
                                        {statusBadge(selectedSession.status)}
                                    </div>

                                    <div className="info-note" style={{ marginBottom: '16px' }}>
                                        <strong>Administrative Verification Required:</strong> Review prospective allotments below. Staff may disallow allocations for candidates with disciplinary holds or outstanding balances. Disallowed allocations revert to vacancies for Round 2.
                                    </div>

                                    {verifyLoading ? (
                                        <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24 }} /></div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1, minWidth: '180px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-muted)' }}>Search Applicants</label>
                                                    <input type="text" className="input" placeholder="Search by student name or registration number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                                </div>
                                                <div style={{ minWidth: '110px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-muted)' }}>Block</label>
                                                    <select className="input" value={filterBlock} onChange={e => setFilterBlock(e.target.value)}>
                                                        <option value="ALL">All Blocks</option>
                                                        {uniqueBlocks.map(b => <option key={b} value={b}>Block {b}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ minWidth: '120px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-muted)' }}>Allocation Basis</label>
                                                    <select className="input" value={filterPlacedBy} onChange={e => setFilterPlacedBy(e.target.value)}>
                                                        <option value="ALL">All Placements</option>
                                                        <option value="pref1">Preference 1</option>
                                                        <option value="pref2">Preference 2</option>
                                                        <option value="vacancy">Vacancy Fill</option>
                                                    </select>
                                                </div>
                                                <div style={{ minWidth: '110px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-muted)' }}>Room Type</label>
                                                    <select className="input" value={filterRoomType} onChange={e => setFilterRoomType(e.target.value)}>
                                                        <option value="ALL">All Types</option>
                                                        {uniqueRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ minWidth: '150px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-muted)' }}>Sort Criteria</label>
                                                    <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                                        <option value="block-room">Block &amp; Room Sequence</option>
                                                        <option value="cgpa-desc">CGPA: Descending</option>
                                                        <option value="cgpa-asc">CGPA: Ascending</option>
                                                        <option value="size-desc">Group Size</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Displaying {displayGroups.length} allocation groups ({displayGroups.reduce((acc, g) => acc + g.length, 0)} total students)
                                            </div>

                                            <div className="table-container" style={{ maxHeight: '420px', overflow: 'auto', marginBottom: '18px' }}>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Group Size</th>
                                                            <th>Reg Number(s)</th>
                                                            <th>Student Name(s)</th>
                                                            <th>CGPA</th>
                                                            <th>Block</th>
                                                            <th>Room</th>
                                                            <th>Type</th>
                                                            <th>Placement Source</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {displayGroups.map((group) => {
                                                            const first = group[0];
                                                            const names = group.map(a => a.student.name).join(', ');
                                                            const regNos = group.map(a => a.student.regNo).join(', ');
                                                            const cgpas = group.map(a => a.student.cgpa).join(', ');
                                                            return (
                                                                <tr key={first.groupId}>
                                                                    <td>
                                                                        <span className="badge badge-purple">{group.length} {group.length === 1 ? 'Solo' : 'Pair/Triple'}</span>
                                                                    </td>
                                                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{regNos}</td>
                                                                    <td style={{ fontWeight: 500 }}>{names}</td>
                                                                    <td>{cgpas}</td>
                                                                    <td style={{ fontWeight: 600 }}>Block {first.room?.block?.number}</td>
                                                                    <td style={{ fontWeight: 600 }}>{first.room?.roomNumber}</td>
                                                                    <td><span className="badge badge-purple">{first.room?.roomType?.code}</span></td>
                                                                    <td>
                                                                        <span className={`badge ${first.placedBy === 'pref1' ? 'badge-success' : first.placedBy === 'pref2' ? 'badge-warning' : 'badge-info'}`}>
                                                                            {first.placedBy === 'pref1' ? 'Pref 1' : first.placedBy === 'pref2' ? 'Pref 2' : 'Vacancy'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            className="btn btn-danger btn-sm"
                                                                            onClick={() => disallowAllotment(first.id, names)}
                                                                            disabled={disallowing === first.id}
                                                                        >
                                                                            {disallowing === first.id ? <span className="spinner" /> : 'Disallow'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <button className="btn btn-success" onClick={lockRound1} disabled={running}>
                                                    {running ? <><span className="spinner" /> Locking Round 1...</> : 'Lock Round 1 &amp; Proceed to Round 2'}
                                                </button>
                                                <Link href={`/admin/results/${selectedSession.id}`} className="btn btn-outline">
                                                    Inspect Full Statistics &rarr;
                                                </Link>
                                                <button className="btn btn-outline" onClick={resetSession} disabled={running} style={{ marginLeft: 'auto' }}>
                                                    Reset Allotment
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={deleteSession} disabled={running}>
                                                    Delete Session
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ====== ROUND1_LOCKED: Proceed to R2 ====== */}
                            {selectedSession.status === 'ROUND1_LOCKED' && (
                                <div className="card" style={{ marginBottom: '20px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Round 2 Processing: Vacancy Resolution</span>
                                        {statusBadge(selectedSession.status)}
                                    </div>
                                    <div className="info-note" style={{ marginBottom: '16px' }}>
                                        <strong>Round 1 is Locked.</strong> Verification is finalized. Rooms released from manual disallowals or initial vacancies are ready for waitlisted applicants in merit sequence.
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button className="btn btn-success" onClick={() => runRound(2)} disabled={running}>
                                            {running ? <><span className="spinner" /> Running Round 2...</> : 'Execute Round 2 (Fill Vacancies)'}
                                        </button>
                                        <Link href={`/admin/results/${selectedSession.id}`} className="btn btn-outline">
                                            View Interim Round 1 Results
                                        </Link>
                                        <button className="btn btn-outline" onClick={resetSession} disabled={running} style={{ marginLeft: 'auto' }}>
                                            Reset Allotment
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={deleteSession} disabled={running}>
                                            Delete Session
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ====== ROUND2_DONE ====== */}
                            {selectedSession.status === 'ROUND2_DONE' && (
                                <div className="card" style={{ marginBottom: '20px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Allotment Finalized</span>
                                        {statusBadge(selectedSession.status)}
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                                        Both allotment rounds have concluded. All records are finalized for publication.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Link href={`/admin/results/${selectedSession.id}`} className="btn btn-primary">
                                            View Session Results &amp; Export CSV &rarr;
                                        </Link>
                                        <button className="btn btn-outline" onClick={resetSession} disabled={running} style={{ marginLeft: 'auto' }}>
                                            Reset Allotment
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={deleteSession} disabled={running}>
                                            Delete Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Round Stats summary */}
                    {roundStats && (
                        <div className="card animate-in" style={{ marginBottom: '20px' }}>
                            <div className="card-header">
                                <span className="card-title">Round {roundStats.round} Execution Metrics</span>
                            </div>
                            <div className="stats-grid" style={{ marginBottom: 0 }}>
                                <div className="stat-card">
                                    <div className="stat-icon green">ALL</div>
                                    <div className="stat-info">
                                        <h3>{roundStats.allottedStudents}</h3>
                                        <p>Students Placed</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">P1</div>
                                    <div className="stat-info">
                                        <h3>{roundStats.allottedPref1}</h3>
                                        <p>Matched Preference 1</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon cyan">P2</div>
                                    <div className="stat-info">
                                        <h3>{roundStats.allottedPref2}</h3>
                                        <p>Matched Preference 2</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon yellow">VAC</div>
                                    <div className="stat-info">
                                        <h3>{roundStats.allottedRandom}</h3>
                                        <p>Vacancy Placements</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon red">WTL</div>
                                    <div className="stat-info">
                                        <h3>{roundStats.waitlistedStudents}</h3>
                                        <p>{roundStats.round === 1 ? 'Waitlisted' : 'Designated Off-Campus'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Audit Log Section */}
                    <div className="section" style={{ marginTop: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h2 className="section-title" style={{ margin: 0 }}>Database Security &amp; Audit Trail</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline btn-sm" onClick={fetchAuditLogs} disabled={auditLogsLoading}>
                                    Refresh Logs
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={setupAuditLog} disabled={auditSetupBusy}>
                                    {auditSetupBusy ? <span className="spinner" /> : 'Initialize Database Trigger'}
                                </button>
                            </div>
                        </div>

                        {auditSetupMsg && (
                            <div className="info-note" style={{ marginBottom: '12px' }}>
                                {auditSetupMsg}
                            </div>
                        )}

                        <div className="table-container" style={{ maxHeight: '240px', overflow: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action Taken</th>
                                        <th>Table Affected</th>
                                        <th>Record Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                                                No audit entries recorded in database.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.slice(0, 30).map((log, idx) => (
                                            <tr key={idx}>
                                                <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {new Date(log.timestamp || log.createdAt).toLocaleString('en-GB')}
                                                </td>
                                                <td><span className="badge badge-purple">{log.action || log.operation}</span></td>
                                                <td style={{ fontFamily: 'monospace' }}>{log.table_name || log.tableName}</td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {log.details || JSON.stringify(log.record_id || log.data || {})}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
