'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentLandingPage() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetch('/api/student/blocks')
            .then(r => r.json())
            .then(d => {
                const blocks = d.blocks || [];
                setStats({
                    blocks: blocks.length,
                    beds: blocks.reduce((s, b) => s + b.totalBeds, 0),
                    boys: blocks.filter(b => b.gender === 'MALE').length,
                    girls: blocks.filter(b => b.gender === 'FEMALE').length,
                });
            })
            .catch(() => { });
    }, []);

    return (
        <>
            <nav className="s-nav">
                <Link href="/student" className="s-nav-brand">
                    <span className="s-nav-brand-badge">MIT</span>
                    Student Portal <span>&bull; Hostel Allotment</span>
                </Link>
                <div className="s-nav-links">
                    <Link href="/student/blocks" className="s-nav-link">Campus Blocks</Link>
                    <Link href="/student/login" className="s-btn s-btn-primary s-btn-sm">Login / Register &rarr;</Link>
                </div>
            </nav>

            <div className="s-page">
                <div className="s-container">
                    {/* Welcome Banner */}
                    <div className="s-card" style={{ padding: '36px 32px', marginBottom: '24px' }}>
                        <div style={{ maxWidth: '720px' }}>
                            <span className="s-badge s-badge-blue" style={{ marginBottom: '12px' }}>
                                Academic Session 2026&ndash;2027
                            </span>
                            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--s-text-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
                                Undergraduate Hostel Allotment Portal
                            </h1>
                            <p style={{ fontSize: '14px', color: 'var(--s-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                                Welcome to the official hostel allotment system for Year 2, 3, and 4 undergraduate students of Manipal Institute of Technology. Form roommate groups, register prioritized block choices, and track your allocation status.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <Link href="/student/login" className="s-btn s-btn-primary s-btn-lg">
                                    Sign In / Register &rarr;
                                </Link>
                                <Link href="/student/blocks" className="s-btn s-btn-outline s-btn-lg">
                                    Inspect Hostel Blocks
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Real Application Metrics */}
                    {stats && (
                        <div className="s-stats-row" style={{ marginBottom: '28px' }}>
                            <div className="s-stat">
                                <div className="s-stat-value">{stats.blocks}</div>
                                <div className="s-stat-label">In-Scope Blocks</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{stats.beds.toLocaleString()}</div>
                                <div className="s-stat-label">Total Bed Capacity</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{stats.boys} Blocks</div>
                                <div className="s-stat-label">Male Hostels</div>
                            </div>
                            <div className="s-stat">
                                <div className="s-stat-value">{stats.girls} Blocks</div>
                                <div className="s-stat-label">Female Hostels</div>
                            </div>
                        </div>
                    )}

                    {/* Step-by-Step Overview */}
                    <div className="s-card">
                        <div className="s-card-header">
                            <span className="s-card-title">Student Allotment Lifecycle</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                            {[
                                { step: '01', title: 'Account Registration', desc: 'Authenticate with your official 9-digit student registration number and record your current academic profile.' },
                                { step: '02', title: 'Group Formation', desc: 'Apply as an individual or team up with up to 2 peers of the same gender using a unique group invite code.' },
                                { step: '03', title: 'Preference Ranking', desc: 'Group leaders submit Preference 1 and Preference 2 block and room configurations before portal closure.' },
                                { step: '04', title: 'Allotment & Order', desc: 'Inspect confirmed room assignments and download your formal Provisional Hostel Admission Order.' },
                            ].map(item => (
                                <div key={item.step} style={{ background: '#f8fafc', border: '1px solid var(--s-border)', borderRadius: 'var(--s-radius)', padding: '18px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-blue)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Step {item.step}
                                    </span>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--s-text-primary)', margin: '6px 0' }}>
                                        {item.title}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--s-text-secondary)', lineHeight: 1.55 }}>
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
