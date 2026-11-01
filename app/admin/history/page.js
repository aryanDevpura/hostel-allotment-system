import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    const sessions = await prisma.allotmentSession.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { students: true, allotments: true } },
        },
    });

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Allotment Session History</h1>
                    <p>Archive of all historical allotment runs, applicant cohorts, and final allocation outcomes</p>
                </div>
                <Link href="/admin/upload" className="btn btn-primary">
                    Create New Session
                </Link>
            </div>

            {sessions.length === 0 ? (
                <div className="empty-state">
                    <h3>No past sessions recorded</h3>
                    <p style={{ marginTop: '4px' }}>Upload a student preference CSV to initiate your first allotment session.</p>
                    <div style={{ marginTop: '16px' }}>
                        <Link href="/admin/upload" className="btn btn-primary btn-sm">
                            Upload Dataset
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Session ID</th>
                                <th>Session Name</th>
                                <th>Status</th>
                                <th>Total Applicants</th>
                                <th>Allotments Confirmed</th>
                                <th>Timestamp</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => (
                                <tr key={session.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{session.id}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{session.name}</td>
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
                                    <td>{new Date(session.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {session.status !== 'DRAFT' && (
                                                <Link href={`/admin/results/${session.id}`} className="btn btn-outline btn-sm">
                                                    Results &rarr;
                                                </Link>
                                            )}
                                            {session.status === 'DRAFT' && (
                                                <Link href="/admin/allotment" className="btn btn-primary btn-sm">
                                                    Execute &rarr;
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
