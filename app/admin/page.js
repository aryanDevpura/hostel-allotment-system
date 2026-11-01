import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const [blocks, rooms, sessions] = await Promise.all([
        prisma.block.count(),
        prisma.room.count(),
        prisma.allotmentSession.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                _count: { select: { students: true, allotments: true } },
            },
        }),
    ]);

    // Calculate total bed capacity
    const roomsByType = await prisma.room.groupBy({
        by: ['roomTypeId'],
        _count: true,
    });
    const roomTypes = await prisma.roomType.findMany();
    const rtMap = Object.fromEntries(roomTypes.map(rt => [rt.id, rt]));
    const totalBeds = roomsByType.reduce((sum, r) => sum + r._count * (rtMap[r.roomTypeId]?.capacity || 0), 0);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Hostel Administration Dashboard</h1>
                    <p>Central overview of block inventories, student rosters, and allotment sessions</p>
                </div>
                <Link href="/admin/upload" className="btn btn-primary">
                    Create New Session
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">BLK</div>
                    <div className="stat-info">
                        <h3>{blocks}</h3>
                        <p>Active Hostel Blocks</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan">RMS</div>
                    <div className="stat-info">
                        <h3>{rooms.toLocaleString()}</h3>
                        <p>Total Configured Rooms</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">BED</div>
                    <div className="stat-info">
                        <h3>{totalBeds.toLocaleString()}</h3>
                        <p>Total Bed Capacity</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">SES</div>
                    <div className="stat-info">
                        <h3>{sessions.length}</h3>
                        <p>Recorded Sessions</p>
                    </div>
                </div>
            </div>

            <div className="section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Recent Allotment Sessions</h2>
                    <Link href="/admin/history" style={{ fontSize: '12px', fontWeight: 600 }}>
                        View Full History &rarr;
                    </Link>
                </div>

                {sessions.length === 0 ? (
                    <div className="empty-state">
                        <h3>No sessions on record</h3>
                        <p style={{ marginTop: '4px' }}>Upload a student preference CSV to initiate your first allotment session.</p>
                        <div style={{ marginTop: '16px' }}>
                            <Link href="/admin/upload" className="btn btn-primary btn-sm">
                                Upload CSV Dataset
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Session Identifier</th>
                                    <th>Status</th>
                                    <th>Registered Students</th>
                                    <th>Total Allotments</th>
                                    <th>Date Created</th>
                                    <th>Available Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => (
                                    <tr key={session.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                                            {session.name}
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                session.status === 'ROUND2_DONE' ? 'badge-success' :
                                                session.status === 'ROUND1_DONE' ? 'badge-warning' :
                                                session.status === 'ROUND1_LOCKED' ? 'badge-info' :
                                                'badge-purple'
                                            }`}>
                                                {session.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{session._count.students.toLocaleString()}</td>
                                        <td>{session._count.allotments.toLocaleString()}</td>
                                        <td>{new Date(session.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td>
                                            {session.status !== 'DRAFT' ? (
                                                <Link href={`/admin/results/${session.id}`} className="btn btn-outline btn-sm">
                                                    View Results &rarr;
                                                </Link>
                                            ) : (
                                                <Link href="/admin/allotment" className="btn btn-primary btn-sm">
                                                    Configure &amp; Run &rarr;
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="section">
                <h2 className="section-title">Administrative Workflows</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Block &amp; Inventory Management</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            Inspect gender segregation, floor plans, room configurations, and bed capacity totals across campus blocks.
                        </p>
                        <Link href="/admin/blocks" className="btn btn-outline btn-sm">
                            Manage Blocks
                        </Link>
                    </div>

                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Student CSV Ingestion</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            Parse and validate applicant cohorts, CGPAs, departments, and roommate links prior to allotment execution.
                        </p>
                        <Link href="/admin/upload" className="btn btn-outline btn-sm">
                            Import Data File
                        </Link>
                    </div>

                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Allotment Processing</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            Apply hard block cutoffs, roommate CGPA constraints, verify Round 1 matches, and execute Round 2 vacancy fills.
                        </p>
                        <Link href="/admin/allotment" className="btn btn-outline btn-sm">
                            Open Allotment Engine
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
