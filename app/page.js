'use client';

import Link from 'next/link';
import { useState } from 'react';
import './home.css';

const FAQ_DATA = [
    {
        q: 'Who is eligible for hostel allotment?',
        a: 'All BTech students of Manipal Institute of Technology currently enrolled in Year 2, Year 3, or Year 4 are eligible. First-year students are allotted separate blocks (Blocks 1–7, 9, 11, 12, 16, 17) and are not part of this system.',
    },
    {
        q: 'Can I choose my roommate?',
        a: 'Yes. You can apply with up to 2 roommates (forming a group of 2 or 3). All roommates must be the same gender. If you apply solo but choose a Double or Quadruple room, you will be paired with other solo applicants who selected the same block and room type.',
    },
    {
        q: 'How is CGPA calculated for a group?',
        a: 'For solo applicants, individual CGPA is used. For groups, the arithmetic mean (average) CGPA of all members is calculated. This averaged CGPA determines the group priority order in the allotment queue.',
    },
    {
        q: 'What happens if both my preferences are full?',
        a: 'If both Preference 1 and Preference 2 blocks and room types are filled to capacity, the system attempts placement in any available room across all eligible blocks matching your gender and group size in CGPA priority order. If unplaced after Round 1, the group is waitlisted.',
    },
    {
        q: 'What is the difference between Round 1 and Round 2?',
        a: 'Round 1 processes all registered students against preferences and initial vacancies. Students unplaced in Round 1 enter the waitlist. Round 2 re-evaluates waitlisted students against rooms released through verification or cancellation. Students unplaced after Round 2 are designated off-campus.',
    },
    {
        q: 'Can a solo student apply for a Double room?',
        a: 'Yes. A solo applicant may select a Double room. The system will attempt to pair you with another solo applicant choosing the same block and room type. If unmatched, the room is allotted with one bed vacant for subsequent matching.',
    },
    {
        q: 'Can I choose my specific room number?',
        a: 'No. Students select preferred Block and Room Type combinations (e.g., Block 14, SAC). Room numbers within that block are assigned systematically by floor and room sequence.',
    },
    {
        q: 'What room types are available?',
        a: 'Seven configurations are supported: Single Attached (SA), Single Attached AC (SAC), Single Non-Attached (SC), Double Attached (DA), Double Attached AC (DAC), Double Non-Attached (DC), and Quadruple Attached AC (QAC). Attached rooms have en-suite washroom facilities.',
    },
    {
        q: 'How do I submit my preferences?',
        a: 'Register in the Student Portal using your 9-digit registration number, form or join a group with an invite code (or proceed solo), and have the group leader select Preference 1 and Preference 2 during the active application window. Once locked, preferences cannot be modified.',
    },
    {
        q: 'Is the allotment final or can it change?',
        a: 'Following Round 1, hostel administration verifies student clearance. Any disallowed allocation reopens the room for Round 2. Once Round 2 concludes and is published, allocations are permanent on official university records.',
    },
];

const ROOM_TYPES = [
    { code: 'SA', name: 'Single Attached Non-AC', cap: 1, desc: 'Private room with private attached washroom.', blocks: '13, 18, 19, 20, 21' },
    { code: 'SAC', name: 'Single Attached AC', cap: 1, desc: 'Private room with private attached washroom and air conditioning.', blocks: '10, 13, 14, 15, 18, 19, 20, 21, 23' },
    { code: 'SC', name: 'Single Non-Attached Non-AC', cap: 1, desc: 'Private room with shared floor washrooms.', blocks: '10' },
    { code: 'DA', name: 'Double Attached Non-AC', cap: 2, desc: 'Shared double occupancy with private attached washroom.', blocks: '8, 13' },
    { code: 'DAC', name: 'Double Attached AC', cap: 2, desc: 'Shared double occupancy with attached washroom and AC.', blocks: '8, 13, 14, 15, 22, 23' },
    { code: 'DC', name: 'Double Non-Attached Non-AC', cap: 2, desc: 'Shared double occupancy with shared floor washrooms.', blocks: '10' },
    { code: 'QAC', name: 'Quadruple Attached AC', cap: 4, desc: 'Shared quadruple occupancy with attached washroom and AC.', blocks: '23' },
];

export default function Home() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="home-container">
            {/* Institutional Header */}
            <header className="inst-header">
                <div className="inst-header-inner">
                    <div className="inst-brand">
                        <div className="inst-emblem">MIT</div>
                        <div>
                            <div className="inst-title">Manipal Institute of Technology</div>
                            <div className="inst-sub">Directorate of Student Affairs — Hostel Allotment System</div>
                        </div>
                    </div>
                    <nav className="inst-nav-links">
                        <a href="#eligibility">Eligibility</a>
                        <a href="#process">Process</a>
                        <a href="#room-types">Room Types</a>
                        <a href="#algorithm">Algorithm</a>
                        <a href="#faqs">FAQs</a>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="home-main">
                {/* Welcome Panel */}
                <div className="welcome-panel">
                    <span className="welcome-badge">Official Administration Portal</span>
                    <h1 className="welcome-title">Hostel Accommodation Allotment</h1>
                    <p className="welcome-desc">
                        Official centralized room allocation portal for undergraduate students of Manipal Institute of Technology.
                        Allotments are processed transparently based on cumulative grade point average (CGPA), group configuration, and room availability.
                    </p>
                </div>

                {/* Portal Cards */}
                <div className="portal-grid">
                    <Link href="/student" className="portal-card">
                        <div className="portal-card-top">
                            <div className="portal-meta">
                                <span className="portal-tag student">Student Access</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Years 2, 3 &amp; 4</span>
                            </div>
                            <h2 className="portal-title">Student Portal</h2>
                            <p className="portal-desc">
                                Register or sign in using your university registration number, form roommate groups with invite codes, submit prioritized block preferences, and download your provisional admission order.
                            </p>
                        </div>
                        <div className="portal-action">
                            Enter Student Portal &rarr;
                        </div>
                    </Link>

                    <Link href="/admin" className="portal-card">
                        <div className="portal-card-top">
                            <div className="portal-meta">
                                <span className="portal-tag admin">Staff &amp; Wardens</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Authorized Only</span>
                            </div>
                            <h2 className="portal-title">Administrative Portal</h2>
                            <p className="portal-desc">
                                Configure hostel block inventories, upload student applicant rosters via CSV, apply CGPA cutoffs and constraints, execute allotment rounds, and generate official university reports.
                            </p>
                        </div>
                        <div className="portal-action">
                            Enter Admin Dashboard &rarr;
                        </div>
                    </Link>
                </div>

                {/* Eligibility Section */}
                <section className="info-section" id="eligibility">
                    <div className="info-section-header">
                        <h2 className="info-section-title">Eligibility Criteria &amp; Regulations</h2>
                        <p className="info-section-subtitle">Scope and qualifications for hostel room application</p>
                    </div>

                    <div className="info-cards-row">
                        <div className="info-card eligible">
                            <h4>Eligible Applicants</h4>
                            <ul>
                                <li>Enrolled BTech students entering Year 2, Year 3, or Year 4.</li>
                                <li>Valid CGPA record maintained in university academic records.</li>
                                <li>Full clearance of prior semester hostel fees and disciplinary records.</li>
                            </ul>
                        </div>
                        <div className="info-card not-eligible">
                            <h4>Excluded from Current System</h4>
                            <ul>
                                <li>First-year students (allotted separately to Blocks 1–7, 9, 11, 12, 16, 17).</li>
                                <li>Students with unresolved financial or disciplinary holds.</li>
                                <li>Registered Day Scholar students.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="info-note">
                        <strong>Gender-Separated Allocation:</strong> Male students are eligible for Blocks 10, 14, 15, 18, 19, 20, and 23. Female students are eligible for Blocks 8, 13, 21, and 22. Strict separation is systematically enforced at application and allotment.
                    </div>
                </section>

                {/* Process Section */}
                <section className="info-section" id="process">
                    <div className="info-section-header">
                        <h2 className="info-section-title">Allotment Procedure</h2>
                        <p className="info-section-subtitle">Sequential steps from registration to room confirmation</p>
                    </div>

                    <div className="steps-flow">
                        <div className="step-card">
                            <span className="step-number">Step 01</span>
                            <h4>Portal Registration &amp; Grouping</h4>
                            <p>Students authenticate using their registration number. Applicants can apply solo or form groups of 2 to 3 students via secure invite codes. All members must share the same gender.</p>
                        </div>
                        <div className="step-card">
                            <span className="step-number">Step 02</span>
                            <h4>Preference Submission</h4>
                            <p>The designated group leader selects Preference 1 and Preference 2 (Block and Room Type). Room capacity must accommodate the group size. Preferences are locked upon submission.</p>
                        </div>
                        <div className="step-card">
                            <span className="step-number">Step 03</span>
                            <h4>Algorithmic Processing</h4>
                            <p>The allocation engine ranks groups strictly by mean CGPA (with study year as tiebreaker). Round 1 fills preferences and vacancies; Round 2 resolves remaining waitlists.</p>
                        </div>
                        <div className="step-card">
                            <span className="step-number">Step 04</span>
                            <h4>Order Issuance</h4>
                            <p>Allotted students inspect room number and fee schedules on their dashboard, downloading their formal Provisional Hostel Admission Order for check-in.</p>
                        </div>
                    </div>
                </section>

                {/* Room Types Section */}
                <section className="info-section" id="room-types">
                    <div className="info-section-header">
                        <h2 className="info-section-title">Hostel Blocks &amp; Room Specifications</h2>
                        <p className="info-section-subtitle">Official room configurations across 11 active blocks</p>
                    </div>

                    <div className="room-type-grid">
                        {ROOM_TYPES.map(rt => (
                            <div key={rt.code} className="rt-card">
                                <div className="rt-card-header">
                                    <span className="rt-code">{rt.code}</span>
                                    <span className="rt-cap">{rt.cap} {rt.cap === 1 ? 'Bed' : 'Beds'}</span>
                                </div>
                                <h4 className="rt-name">{rt.name}</h4>
                                <p className="rt-desc">{rt.desc}</p>
                                <div className="rt-blocks">
                                    <span className="rt-blocks-label">Active Blocks:</span> Block {rt.blocks}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Algorithm Section */}
                <section className="info-section" id="algorithm">
                    <div className="info-section-header">
                        <h2 className="info-section-title">Allocation Algorithm Specifications</h2>
                        <p className="info-section-subtitle">Merit-based priority rules and tiebreaking criteria</p>
                    </div>

                    <div className="algo-steps">
                        <div className="algo-step">
                            <div className="algo-step-num">Rule 01</div>
                            <div className="algo-step-content">
                                <h4>Composite Group Merit Calculation</h4>
                                <p>For pairs and triples, merit score is defined as the arithmetic mean of all confirmed members&apos; CGPAs. Solo applicants utilize their individual CGPA.</p>
                            </div>
                        </div>
                        <div className="algo-step">
                            <div className="algo-step-num">Rule 02</div>
                            <div className="algo-step-content">
                                <h4>Queue Ranking &amp; Tiebreaking</h4>
                                <p>Applications are ordered descending by CGPA. When merit scores are identical, seniority acts as the primary tiebreaker in order of Year 2 &gt; Year 3 &gt; Year 4.</p>
                            </div>
                        </div>
                        <div className="algo-step">
                            <div className="algo-step-num">Rule 03</div>
                            <div className="algo-step-content">
                                <h4>Preference Evaluation &amp; Vacancy Placement</h4>
                                <p>The engine attempts Preference 1 assignment first. If fully allocated, Preference 2 is attempted. Remaining candidates are evaluated against compatible vacancies or transferred to the Round 2 waitlist.</p>
                            </div>
                        </div>
                    </div>

                    <div className="example-box">
                        <h4 className="example-title">Illustrative Allotment Case</h4>
                        <p className="example-desc">Sample queue execution displaying systematic priority assignment:</p>

                        <div className="table-container" style={{ marginBottom: '14px' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Application</th>
                                        <th>Members</th>
                                        <th>Mean CGPA</th>
                                        <th>Preference 1</th>
                                        <th>Preference 2</th>
                                        <th>Assigned Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Solo B</td>
                                        <td>Karan (solo)</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>9.50</td>
                                        <td>Block 14, DAC</td>
                                        <td>Block 23, SAC</td>
                                        <td><span className="badge badge-success">Assigned Pref 1</span></td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Group A</td>
                                        <td>Rahul (9.20) + Aman (8.80)</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>9.00</td>
                                        <td>Block 14, DAC</td>
                                        <td>Block 15, SAC</td>
                                        <td><span className="badge badge-success">Assigned Pref 1</span></td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Group C</td>
                                        <td>Sid (8.70) + Nik (8.30) + Pranav (8.90)</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>8.63</td>
                                        <td>Block 23, QAC</td>
                                        <td>Block 14, DAC</td>
                                        <td><span className="badge badge-success">Assigned Pref 1</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="info-note">
                            Queue order follows descending merit: Candidate B (9.50) &rarr; Group A (9.00) &rarr; Group C (8.63). Capacity constraints determine room assignment sequentially.
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="info-section" id="faqs">
                    <div className="info-section-header">
                        <h2 className="info-section-title">Frequently Asked Questions</h2>
                        <p className="info-section-subtitle">Clarifications regarding policies, room types, and rounds</p>
                    </div>

                    <div className="faq-list">
                        {FAQ_DATA.map((faq, i) => (
                            <div key={i} className="faq-item">
                                <button
                                    type="button"
                                    className="faq-question"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    aria-expanded={openFaq === i}
                                >
                                    <span>{faq.q}</span>
                                    <span className="faq-indicator">{openFaq === i ? '−' : '+'}</span>
                                </button>
                                {openFaq === i && (
                                    <div className="faq-answer">
                                        <p>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Institutional Footer */}
            <footer className="home-footer">
                <div>Manipal Institute of Technology &bull; Manipal Academy of Higher Education</div>
                <div style={{ marginTop: '4px' }}>Hostel Management &amp; Allotment System &bull; Academic Year 2026–2027</div>
            </footer>
        </div>
    );
}
