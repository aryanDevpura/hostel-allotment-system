'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CampusBlocksPage() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterGender, setFilterGender] = useState('ALL');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/student/blocks')
            .then(r => r.json())
            .then(d => { setBlocks(d.blocks || []); setLoading(false); })
            .catch(() => { setError('Failed to retrieve hostel block inventory.'); setLoading(false); });
    }, []);

    const filtered = blocks
        .filter(b => filterGender === 'ALL' || b.gender === filterGender)
        .filter(b => search === '' || b.number.toString().includes(search));

    const boysBlocks = blocks.filter(b => b.gender === 'MALE').length;
    const girlsBlocks = blocks.filter(b => b.gender === 'FEMALE').length;

    return (
        <div className="s-page">
            <nav className="s-nav">
                <Link href="/student" className="s-nav-brand">
                    <span className="s-nav-brand-badge">MIT</span>
                    Hostel Portal <span>&bull; Block Directory</span>
                </Link>
                <div className="s-nav-links">
                    <Link href="/student/dashboard" className="s-nav-link">&larr; Return to Dashboard</Link>
                </div>
            </nav>

            <div className="s-container">
                <div className="s-card" style={{ marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--s-text-primary)', marginBottom: '4px' }}>
                        Hostel Blocks &amp; Accommodations Directory
                    </h1>
                    <p style={{ color: 'var(--s-text-muted)', fontSize: '13px' }}>
                        Review physical room configurations, capacities, and amenities across campus blocks to inform your preference submissions.
                    </p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <span className="s-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                        <p style={{ marginTop: '12px', color: 'var(--s-text-muted)' }}>Loading hostel inventory...</p>
                    </div>
                ) : error ? (
                    <div className="s-alert s-alert-error">{error}</div>
                ) : (
                    <>
                        {/* Summary stats */}
                        <div className="s-stats-row">
                            <div className="s-stat">
                                <div className="s-stat-value">{blocks.length}</div>
                                <div className="s-stat-label">Total Blocks</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{boysBlocks}</div>
                                <div className="s-stat-label">Male Hostels</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{girlsBlocks}</div>
                                <div className="s-stat-label">Female Hostels</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{blocks.reduce((s, b) => s + b.totalBeds, 0).toLocaleString()}</div>
                                <div className="s-stat-label">Total Bed Capacity</div>
                            </div>
                        </div>

                        {/* Filter bar */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                className="s-input"
                                style={{ maxWidth: '220px' }}
                                placeholder="Search by block number..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {[
                                { key: 'ALL', label: 'All Hostels' },
                                { key: 'MALE', label: 'Male Only' },
                                { key: 'FEMALE', label: 'Female Only' },
                            ].map(g => (
                                <button
                                    key={g.key}
                                    type="button"
                                    className={`s-btn ${filterGender === g.key ? 's-btn-primary' : 's-btn-ghost'} s-btn-sm`}
                                    onClick={() => setFilterGender(g.key)}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>

                        {filtered.length === 0 && (
                            <div className="s-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <p style={{ color: 'var(--s-text-muted)' }}>No hostel blocks match your selected search or filter criteria.</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                            {filtered.map(block => (
                                <div key={block.id} className="s-block-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div>
                                            <div className="s-block-num">Block {block.number}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--s-text-muted)' }}>{block.floors} Physical Floors</div>
                                        </div>
                                        <span className={`s-badge ${block.gender === 'MALE' ? 's-badge-blue' : 's-badge-teal'}`}>
                                            {block.gender === 'MALE' ? 'Male' : 'Female'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                        <div className="s-stat" style={{ padding: '8px' }}>
                                            <div className="s-stat-value" style={{ fontSize: '15px' }}>{block.totalRooms}</div>
                                            <div className="s-stat-label">Rooms</div>
                                        </div>
                                        <div className="s-stat" style={{ padding: '8px' }}>
                                            <div className="s-stat-value" style={{ fontSize: '15px' }}>{block.totalBeds}</div>
                                            <div className="s-stat-label">Beds</div>
                                        </div>
                                    </div>

                                    {block.roomTypeBreakdown.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--s-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                                Room Specifications
                                            </div>
                                            <div className="s-table-wrap">
                                                <table className="s-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Type</th>
                                                            <th>Cap</th>
                                                            <th>Rooms</th>
                                                            <th>Beds</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {block.roomTypeBreakdown.map(rt => (
                                                            <tr key={rt.code}>
                                                                <td><span style={{ fontWeight: 600, color: 'var(--s-blue)' }}>{rt.code}</span></td>
                                                                <td>&times; {rt.capacity}</td>
                                                                <td>{rt.totalRooms}</td>
                                                                <td style={{ fontWeight: 600 }}>{rt.totalBeds}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
