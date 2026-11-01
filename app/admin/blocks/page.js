'use client';

import { useState, useEffect } from 'react';
import './blocks.css';

export default function BlocksPage() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBlock, setExpandedBlock] = useState(null);
    const [filter, setFilter] = useState('all'); // all, boys, girls

    useEffect(() => {
        fetch('/api/blocks')
            .then(res => res.json())
            .then(data => { setBlocks(data.blocks || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = blocks.filter(b => {
        if (filter === 'boys') return b.gender === 'MALE';
        if (filter === 'girls') return b.gender === 'FEMALE';
        return true;
    });

    const totalRooms = filtered.reduce((s, b) => s + b._count.rooms, 0);
    const totalBeds = filtered.reduce((s, b) =>
        s + b.roomConfigs.reduce((rs, rc) => rs + rc.roomsPerFloor * b.floors * rc.roomType.capacity, 0), 0
    );

    if (loading) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1>Hostel Blocks &amp; Inventory</h1>
                        <p>Loading physical inventory from database...</p>
                    </div>
                </div>
                <div className="empty-state">
                    <span className="spinner" style={{ width: 24, height: 24 }} />
                    <p style={{ marginTop: '12px' }}>Retrieving block configurations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Hostel Blocks &amp; Inventory</h1>
                    <p>Physical room configurations, bed capacities, and floor distributions across campus</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="tab-bar">
                {[
                    { key: 'all', label: `All In-Scope Blocks (${blocks.length})` },
                    { key: 'boys', label: `Male Hostels (${blocks.filter(b => b.gender === 'MALE').length})` },
                    { key: 'girls', label: `Female Hostels (${blocks.filter(b => b.gender === 'FEMALE').length})` },
                ].map(t => (
                    <button key={t.key} className={`tab ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">BLK</div>
                    <div className="stat-info">
                        <h3>{filtered.length}</h3>
                        <p>Selected Blocks</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan">RMS</div>
                    <div className="stat-info">
                        <h3>{totalRooms.toLocaleString()}</h3>
                        <p>Total Rooms</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">BED</div>
                    <div className="stat-info">
                        <h3>{totalBeds.toLocaleString()}</h3>
                        <p>Total Bed Capacity</p>
                    </div>
                </div>
            </div>

            {/* Block Cards */}
            <div className="cards-grid">
                {filtered.map((block) => {
                    const blockTotalBeds = block.roomConfigs.reduce(
                        (sum, rc) => sum + rc.roomsPerFloor * block.floors * rc.roomType.capacity, 0
                    );
                    const isExpanded = expandedBlock === block.id;

                    return (
                        <div
                            key={block.id}
                            className={`block-card-interactive ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedBlock(isExpanded ? null : block.id); } }}
                        >
                            <div className="block-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="block-card-number">Block {block.number}</span>
                                    <span className={`badge ${block.gender === 'MALE' ? 'badge-info' : 'badge-purple'}`}>
                                        {block.gender === 'MALE' ? 'Male' : 'Female'}
                                    </span>
                                </div>
                                <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>&#9660;</span>
                            </div>

                            {/* Quick Stats Row */}
                            <div className="block-quick-stats">
                                <div className="bqs-item">
                                    <span className="bqs-value">{block.floors}</span>
                                    <span className="bqs-label">Floors</span>
                                </div>
                                <div className="bqs-item">
                                    <span className="bqs-value">{block._count.rooms}</span>
                                    <span className="bqs-label">Rooms</span>
                                </div>
                                <div className="bqs-item">
                                    <span className="bqs-value">{blockTotalBeds}</span>
                                    <span className="bqs-label">Beds</span>
                                </div>
                                <div className="bqs-item">
                                    <span className="bqs-value">{block.roomConfigs.length}</span>
                                    <span className="bqs-label">Types</span>
                                </div>
                            </div>

                            {/* Room Type Badges */}
                            <div className="block-card-rooms">
                                {block.roomConfigs.map((rc) => (
                                    <span key={rc.id} className="badge badge-purple" style={{ fontSize: '11px' }}>
                                        {rc.roomType.code} ({rc.roomsPerFloor * block.floors} rms)
                                    </span>
                                ))}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="block-expanded" onClick={(e) => e.stopPropagation()}>
                                    <h4 className="block-detail-title">Room Breakdown</h4>
                                    <div className="block-detail-table">
                                        <div className="bdt-header">
                                            <span>Code</span><span>Name</span><span>Capacity</span><span>Per Floor</span><span>Total</span>
                                        </div>
                                        {block.roomConfigs.map((rc) => {
                                            const total = rc.roomsPerFloor * block.floors;
                                            return (
                                                <div key={rc.id} className="bdt-row">
                                                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rc.roomType.code}</span>
                                                    <span>{rc.roomType.name}</span>
                                                    <span>{rc.roomType.capacity} {rc.roomType.capacity === 1 ? 'bed' : 'beds'}</span>
                                                    <span>{rc.roomsPerFloor}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{total}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Occupancy Bar */}
                                    <h4 className="block-detail-title" style={{ marginTop: '12px' }}>Configured Capacity</h4>
                                    {block.roomConfigs.map((rc) => {
                                        const total = rc.roomsPerFloor * block.floors;
                                        const totalCap = total * rc.roomType.capacity;
                                        return (
                                            <div key={rc.id} className="capacity-row">
                                                <div className="capacity-label">
                                                    <span>{rc.roomType.code} &bull; {rc.roomType.name}</span>
                                                    <span>{totalCap} beds ({total} rooms)</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-bar-fill" style={{ width: '100%' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Room Type Summary Table */}
            <div className="section" style={{ marginTop: '32px' }}>
                <h2 className="section-title">Aggregated Room Type Specifications</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Type Code</th>
                                <th>Configuration Name</th>
                                <th>Bed Capacity</th>
                                <th>Distributed Across Blocks</th>
                                <th>Total Room Count</th>
                                <th>Total Bed Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const rtSummary = {};
                                blocks.forEach(b => {
                                    b.roomConfigs.forEach(rc => {
                                        if (!rtSummary[rc.roomType.code]) {
                                            rtSummary[rc.roomType.code] = {
                                                code: rc.roomType.code,
                                                name: rc.roomType.name,
                                                capacity: rc.roomType.capacity,
                                                blocks: [],
                                                totalRooms: 0,
                                            };
                                        }
                                        rtSummary[rc.roomType.code].blocks.push(b.number);
                                        rtSummary[rc.roomType.code].totalRooms += rc.roomsPerFloor * b.floors;
                                    });
                                });
                                return Object.values(rtSummary).map(rt => (
                                    <tr key={rt.code}>
                                        <td><span className="badge badge-purple" style={{ fontWeight: 700 }}>{rt.code}</span></td>
                                        <td style={{ fontWeight: 500 }}>{rt.name}</td>
                                        <td>{rt.capacity} {rt.capacity === 1 ? 'bed' : 'beds'}</td>
                                        <td>Block {rt.blocks.sort((a, b) => a - b).join(', ')}</td>
                                        <td style={{ fontWeight: 600 }}>{rt.totalRooms}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rt.totalRooms * rt.capacity}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
