'use client';

import { useState, useEffect, use } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Link from 'next/link';

const COLORS = ['#1e40af', '#0284c7', '#16a34a', '#d97706', '#dc2626', '#475569', '#6b21a8'];

export default function ResultsPage({ params }) {
    const { sessionId } = use(params);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBlock, setSelectedBlock] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/results/${sessionId}`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1>Session Allotment Analytics</h1>
                        <p>Compiling database results and allocations...</p>
                    </div>
                </div>
                <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24 }} /></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1>Session Results</h1>
                        <p>Specified session could not be located</p>
                    </div>
                </div>
                <div className="empty-state">
                    <h3>Session Record Not Found</h3>
                    <p style={{ marginTop: '4px' }}>Please check the session identifier and try again.</p>
                    <div style={{ marginTop: '16px' }}>
                        <Link href="/admin/history" className="btn btn-outline btn-sm">
                            Return to Session History
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const filteredAllotted = stats.allottedList?.filter(s =>
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Chart data
    const blockChartData = stats.blockStats?.map(b => ({
        name: `Blk ${b.blockNumber}`,
        allotted: b.allotted,
        capacity: b.totalBeds,
        avgCgpa: b.avgCgpa,
    })) || [];

    const roomTypeChartData = stats.roomTypeStats?.map(rt => ({
        name: rt.code,
        count: rt.count,
    })) || [];

    const genderData = stats.genderStats ? [
        { name: 'Male', value: stats.genderStats.MALE || 0 },
        { name: 'Female', value: stats.genderStats.FEMALE || 0 },
    ] : [];

    const yearData = stats.yearStats ? Object.entries(stats.yearStats).map(([yr, count]) => ({
        name: `Year ${yr}`,
        count,
    })) : [];

    // Block room data for preview
    const blockRoomList = selectedBlock && stats.blockRoomData?.[selectedBlock]
        ? stats.blockRoomData[selectedBlock] : [];

    function downloadCSV() {
        if (!stats.allottedList) return;
        const headers = ['Reg No', 'Name', 'Gender', 'Year', 'Department', 'CGPA', 'Block', 'Room', 'Room Type', 'Round'];
        const rows = stats.allottedList.map(s => [
            s.regNo, s.name, s.gender, s.year, s.department, s.cgpa, s.block, s.roomNumber, s.roomType, s.round,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        triggerDownload(csv, `allotment_results_session_${sessionId}.csv`);
    }

    function downloadBlockCSV(blockNum) {
        const rooms = stats.blockRoomData?.[blockNum];
        if (!rooms) return;
        const headers = ['Room Number', 'Floor', 'Room Type', 'Capacity', 'Reg No', 'Name', 'Gender', 'Year', 'Department', 'CGPA', 'Round'];
        const rows = [];
        for (const room of rooms) {
            for (const occ of room.occupants) {
                rows.push([
                    room.roomNumber, room.floor, room.roomType, room.capacity,
                    occ.regNo, occ.name, occ.gender, occ.year, occ.department, occ.cgpa, occ.round,
                ]);
            }
        }
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        triggerDownload(csv, `block_${blockNum}_rooms_session_${sessionId}.csv`);
    }

    function triggerDownload(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Session Allotment Analytics: {stats.session?.name || `Session #${sessionId}`}</h1>
                    <p>Comprehensive placement records, block distribution, and administrative exports</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={downloadCSV}>
                        Export Master CSV
                    </button>
                    <Link href="/admin/allotment" className="btn btn-outline btn-sm">
                        Allotment Control
                    </Link>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon green">ALL</div>
                    <div className="stat-info">
                        <h3>{stats.allotted.toLocaleString()}</h3>
                        <p>Total Allotted</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">WTL</div>
                    <div className="stat-info">
                        <h3>{stats.waitlisted.toLocaleString()}</h3>
                        <p>Waitlisted</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">OFF</div>
                    <div className="stat-info">
                        <h3>{stats.offCampus.toLocaleString()}</h3>
                        <p>Off-Campus</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">TOT</div>
                    <div className="stat-info">
                        <h3>{stats.total.toLocaleString()}</h3>
                        <p>Total Applicants</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">R1</div>
                    <div className="stat-info">
                        <h3>{stats.round1Allotted.toLocaleString()}</h3>
                        <p>Round 1 Placements</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan">R2</div>
                    <div className="stat-info">
                        <h3>{stats.round2Allotted.toLocaleString()}</h3>
                        <p>Round 2 Placements</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                {[
                    { key: 'overview', label: 'Summary Analytics' },
                    { key: 'blocks', label: 'Block Roster View' },
                    { key: 'allotted', label: `Placed Students (${stats.allotted})` },
                    { key: 'waitlisted', label: `Waitlisted (${stats.waitlisted})` },
                    { key: 'off-campus', label: `Off-Campus (${stats.offCampus})` },
                    { key: 'exports', label: 'Institutional Exports' },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => { setActiveTab(t.key); if (t.key !== 'blocks') setSelectedBlock(null); }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ================== OVERVIEW TAB ================== */}
            {activeTab === 'overview' && (
                <div className="animate-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        {/* Capacity vs Occupancy */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Block Bed Capacity vs. Allotted</span>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={blockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} />
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontSize: '12px' }} />
                                    <Bar dataKey="capacity" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Capacity" />
                                    <Bar dataKey="allotted" fill="#1e40af" radius={[2, 2, 0, 0]} name="Allotted" />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Room Type Distribution */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Room Type Allotment Distribution</span>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={roomTypeChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={{ fontSize: 11 }}>
                                        {roomTypeChartData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Gender Split */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Gender Distribution</span>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 11 }}>
                                        <Cell fill="#0284c7" />
                                        <Cell fill="#9333ea" />
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Year Split */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Academic Year Distribution</span>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} />
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontSize: '12px' }} />
                                    <Bar dataKey="count" fill="#16a34a" radius={[2, 2, 0, 0]} name="Students" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Block Statistics Table */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Institutional Block Allocation Roster</span>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Block</th>
                                        <th>Designated Gender</th>
                                        <th>Bed Capacity</th>
                                        <th>Allotted</th>
                                        <th>Occupancy Rate</th>
                                        <th>Mean CGPA</th>
                                        <th>Minimum Cutoff</th>
                                        <th>Allotted Configurations</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.blockStats?.map(b => (
                                        <tr key={b.blockNumber}>
                                            <td style={{ fontWeight: 600 }}>Block {b.blockNumber}</td>
                                            <td>
                                                <span className={`badge ${b.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`}>
                                                    {b.gender === 'MALE' ? 'Male' : 'Female'}
                                                </span>
                                            </td>
                                            <td>{b.totalBeds} beds</td>
                                            <td style={{ fontWeight: 600 }}>{b.allotted}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${Math.min(b.occupancyPercent, 100)}%`,
                                                            height: '100%',
                                                            background: b.occupancyPercent > 90 ? 'var(--accent-danger)' : b.occupancyPercent > 70 ? 'var(--accent-warning)' : 'var(--accent-success)',
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{b.occupancyPercent}%</span>
                                                </div>
                                            </td>
                                            <td>{b.avgCgpa || '—'}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                                                {b.minCgpa !== null ? b.minCgpa : '—'}
                                            </td>
                                            <td>
                                                {Object.entries(b.roomTypes || {}).map(([code, count]) => (
                                                    <span key={code} className="badge badge-purple" style={{ marginRight: '4px', fontSize: '11px' }}>
                                                        {code}: {count}
                                                    </span>
                                                ))}
                                                {Object.keys(b.roomTypes || {}).length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================== BLOCKS TAB ================== */}
            {activeTab === 'blocks' && (
                <div className="animate-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                        {stats.blockStats?.filter(b => b.allotted > 0).map(b => (
                            <button
                                key={b.blockNumber}
                                onClick={() => setSelectedBlock(b.blockNumber)}
                                style={{
                                    padding: '12px 10px',
                                    background: selectedBlock === b.blockNumber ? 'var(--accent-primary-bg)' : '#ffffff',
                                    border: `1px solid ${selectedBlock === b.blockNumber ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Block {b.blockNumber}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {b.allotted} students
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                    <span className={`badge ${b.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                                        {b.gender === 'MALE' ? 'Male' : 'Female'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedBlock ? (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="card-title">Block {selectedBlock} &mdash; Detailed Room Roster</span>
                                <button className="btn btn-outline btn-sm" onClick={() => downloadBlockCSV(selectedBlock)}>
                                    Export Block {selectedBlock} CSV
                                </button>
                            </div>

                            {(() => {
                                const bData = stats.blockStats?.find(b => b.blockNumber === selectedBlock);
                                if (!bData) return null;
                                return (
                                    <div style={{ display: 'flex', gap: '20px', padding: '10px 0', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', fontSize: '13px' }}>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Capacity:</span> <strong>{bData.totalBeds}</strong> beds</div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Placed:</span> <strong style={{ color: 'var(--accent-success)' }}>{bData.allotted}</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Occupancy:</span> <strong>{bData.occupancyPercent}%</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Mean CGPA:</span> <strong>{bData.avgCgpa}</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Cutoff CGPA:</span> <strong>{bData.minCgpa ?? 'None'}</strong></div>
                                    </div>
                                );
                            })()}

                            <div className="table-container" style={{ maxHeight: '480px', overflow: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Room</th>
                                            <th>Floor</th>
                                            <th>Type</th>
                                            <th>Beds Filled</th>
                                            <th>Reg Number</th>
                                            <th>Student Name</th>
                                            <th>Year</th>
                                            <th>Branch</th>
                                            <th>CGPA</th>
                                            <th>Round</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {blockRoomList.map((room) =>
                                            room.occupants.map((occ, oi) => (
                                                <tr key={`${room.roomNumber}-${oi}`}>
                                                    {oi === 0 ? (
                                                        <>
                                                            <td rowSpan={room.occupants.length} style={{ fontWeight: 700, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                                                {room.roomNumber}
                                                            </td>
                                                            <td rowSpan={room.occupants.length} style={{ verticalAlign: 'top' }}>{room.floor}</td>
                                                            <td rowSpan={room.occupants.length} style={{ verticalAlign: 'top' }}>
                                                                <span className="badge badge-purple">{room.roomType}</span>
                                                            </td>
                                                            <td rowSpan={room.occupants.length} style={{ verticalAlign: 'top', fontWeight: 600 }}>
                                                                {room.occupants.length} / {room.capacity}
                                                            </td>
                                                        </>
                                                    ) : null}
                                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{occ.regNo}</td>
                                                    <td style={{ fontWeight: 500 }}>{occ.name}</td>
                                                    <td>Year {occ.year}</td>
                                                    <td>{occ.department}</td>
                                                    <td>{occ.cgpa}</td>
                                                    <td>
                                                        <span className={`badge ${occ.round === 1 ? 'badge-success' : 'badge-warning'}`}>
                                                            Round {occ.round}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <h3>Select a Block to Inspect</h3>
                            <p style={{ marginTop: '4px' }}>Click any block button above to display room-by-room student assignments.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ================== ALLOTTED TAB ================== */}
            {activeTab === 'allotted' && (
                <div className="animate-in">
                    <div style={{ marginBottom: '14px', maxWidth: '340px' }}>
                        <input
                            className="input"
                            placeholder="Filter by applicant name, reg number, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="table-container" style={{ maxHeight: '540px', overflow: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Registration No</th>
                                    <th>Student Name</th>
                                    <th>Gender</th>
                                    <th>Year</th>
                                    <th>Branch</th>
                                    <th>CGPA</th>
                                    <th>Assigned Block</th>
                                    <th>Room</th>
                                    <th>Type</th>
                                    <th>Allotment Round</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAllotted.map((s, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace' }}>{s.regNo}</td>
                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                        <td>
                                            <span className={`badge ${s.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`}>
                                                {s.gender === 'MALE' ? 'M' : 'F'}
                                            </span>
                                        </td>
                                        <td>Year {s.year}</td>
                                        <td>{s.department}</td>
                                        <td>{s.cgpa}</td>
                                        <td style={{ fontWeight: 600 }}>Block {s.block}</td>
                                        <td style={{ fontWeight: 600 }}>{s.roomNumber}</td>
                                        <td><span className="badge badge-purple">{s.roomType}</span></td>
                                        <td>
                                            <span className={`badge ${s.round === 1 ? 'badge-success' : 'badge-warning'}`}>
                                                Round {s.round}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================== WAITLISTED TAB ================== */}
            {activeTab === 'waitlisted' && (
                <div className="animate-in">
                    {stats.waitlistedList?.length === 0 ? (
                        <div className="empty-state"><h3>No waitlisted applicants on record.</h3></div>
                    ) : (
                        <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Registration No</th>
                                        <th>Student Name</th>
                                        <th>Gender</th>
                                        <th>Year</th>
                                        <th>Branch</th>
                                        <th>CGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.waitlistedList?.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ fontFamily: 'monospace' }}>{s.regNo}</td>
                                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                                            <td>
                                                <span className={`badge ${s.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`}>
                                                    {s.gender === 'MALE' ? 'M' : 'F'}
                                                </span>
                                            </td>
                                            <td>Year {s.year}</td>
                                            <td>{s.department}</td>
                                            <td>{s.cgpa}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ================== OFF-CAMPUS TAB ================== */}
            {activeTab === 'off-campus' && (
                <div className="animate-in">
                    {stats.offCampusList?.length === 0 ? (
                        <div className="empty-state"><h3>No applicants categorized as off-campus.</h3></div>
                    ) : (
                        <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Registration No</th>
                                        <th>Student Name</th>
                                        <th>Gender</th>
                                        <th>Year</th>
                                        <th>Branch</th>
                                        <th>CGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.offCampusList?.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ fontFamily: 'monospace' }}>{s.regNo}</td>
                                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                                            <td>
                                                <span className={`badge ${s.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`}>
                                                    {s.gender === 'MALE' ? 'M' : 'F'}
                                                </span>
                                            </td>
                                            <td>Year {s.year}</td>
                                            <td>{s.department}</td>
                                            <td>{s.cgpa}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ================== EXPORTS TAB ================== */}
            {activeTab === 'exports' && (
                <div className="animate-in">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Official CSV Reporting &amp; Exports</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                            Generate signed institutional spreadsheets directly from the production database:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                            <a href={`/api/export/${sessionId}?type=all`} className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '14px', fontSize: '13px' }}>
                                Master Allotment Roster (All {stats.allotted} Allotted) &rarr;
                            </a>
                            <a href={`/api/export/${sessionId}?type=round1`} className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '14px', fontSize: '13px' }}>
                                Round 1 Placement List (Preference Matches) &rarr;
                            </a>
                            <a href={`/api/export/${sessionId}?type=round2`} className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '14px', fontSize: '13px' }}>
                                Round 2 Placement List (Vacancy Matches) &rarr;
                            </a>
                            <a href={`/api/export/${sessionId}?type=pref1`} className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '14px', fontSize: '13px' }}>
                                Preference 1 Successful Allocations &rarr;
                            </a>
                            <a href={`/api/export/${sessionId}?type=unplaced`} className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '14px', fontSize: '13px' }}>
                                Unplaced / Waitlist / Off-Campus Roster &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
