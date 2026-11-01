'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

export default function UploadPage() {
    const [csvData, setCsvData] = useState(null);
    const [fileName, setFileName] = useState('');
    const [errors, setErrors] = useState([]);
    const [validationResult, setValidationResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [sessionName, setSessionName] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const fileRef = useRef(null);

    function handleFile(file) {
        if (!file || !file.name.endsWith('.csv')) {
            setErrors(['Please upload a valid .csv file format.']);
            return;
        }
        setFileName(file.name);
        setErrors([]);
        setValidationResult(null);
        setUploadResult(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setErrors(results.errors.map(e => `Parse error row ${e.row}: ${e.message}`));
                    return;
                }
                setCsvData(results.data);
                // Auto-generate session name
                const date = new Date().toISOString().split('T')[0];
                setSessionName(`Allotment Session ${date}`);
            },
        });
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }

    async function handleValidate() {
        if (!csvData) return;
        try {
            const res = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: csvData }),
            });
            const data = await res.json();
            setValidationResult(data);
            setErrors(data.errors || []);
        } catch (err) {
            setErrors(['Validation request failed: ' + err.message]);
        }
    }

    async function handleUpload() {
        if (!csvData || !sessionName) return;
        setUploading(true);
        setUploadResult(null);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: csvData, sessionName }),
            });
            const data = await res.json();
            if (data.error) {
                setErrors([data.error]);
            } else {
                setUploadResult(data);
            }
        } catch (err) {
            setErrors(['Upload failed: ' + err.message]);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Student Dataset Ingestion</h1>
                    <p>Upload and validate student preference CSV files to create new allotment sessions</p>
                </div>
            </div>

            {/* Dropzone */}
            <div
                className={`dropzone ${isDragOver ? 'active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files[0])}
                />
                {fileName ? (
                    <div>
                        <h3>Selected File: {fileName}</h3>
                        <p>{csvData ? `${csvData.length.toLocaleString()} rows successfully parsed into memory` : 'Parsing CSV file...'}</p>
                        <p style={{ fontSize: '12px', marginTop: '6px', color: 'var(--accent-primary)' }}>Click to select a different file</p>
                    </div>
                ) : (
                    <div>
                        <h3>Select or Drop CSV Data File</h3>
                        <p>Drag and drop a formatted .csv file here, or click to browse local filesystem</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Standard UTF-8 encoded CSV matching university registry schema</p>
                    </div>
                )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="error-list" style={{ marginTop: '20px' }}>
                    <h4>{errors.length} Validation Issue{errors.length > 1 ? 's' : ''} Encountered</h4>
                    <ul>
                        {errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                        {errors.length > 20 && <li>...plus {errors.length - 20} additional warnings/errors</li>}
                    </ul>
                </div>
            )}

            {/* Preview */}
            {csvData && csvData.length > 0 && (
                <div className="section" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h2 className="section-title" style={{ margin: 0 }}>
                            Dataset Preview ({csvData.length.toLocaleString()} Total Records)
                        </h2>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing first {Math.min(csvData.length, 50)} rows</span>
                    </div>

                    <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(csvData[0]).map(col => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.slice(0, 50).map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} style={{ whiteSpace: 'nowrap' }}>{val}</td>
                                        ))}
                                    </tr>
                                ))}
                                {csvData.length > 50 && (
                                    <tr>
                                        <td colSpan={Object.keys(csvData[0]).length} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px' }}>
                                            &mdash; {csvData.length - 50} additional rows loaded &mdash;
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" onClick={handleValidate}>
                            Verify Schema &amp; Eligibility
                        </button>

                        {validationResult && validationResult.valid && (
                            <>
                                <input
                                    className="input"
                                    style={{ maxWidth: '280px' }}
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    placeholder="Enter session name..."
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpload}
                                    disabled={uploading || !sessionName}
                                >
                                    {uploading ? <><span className="spinner" /> Ingesting to Database...</> : 'Confirm & Ingest Session'}
                                </button>
                            </>
                        )}
                    </div>

                    {validationResult && validationResult.valid && !uploadResult && (
                        <div className="success-message" style={{ marginTop: '16px' }}>
                            Data validation passed: {validationResult.studentCount} student records and {validationResult.groupCount} group configurations ready for database ingestion.
                        </div>
                    )}
                </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
                <div className={uploadResult.warning ? "error-list" : "success-message"} style={{ marginTop: '20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                        {uploadResult.warning ? 'Ingestion completed with warnings' : 'Session Created Successfully'} &mdash; &ldquo;{uploadResult.sessionName}&rdquo;
                    </div>
                    <ul style={{ marginTop: '8px', paddingLeft: '18px', fontSize: '13px' }}>
                        <li><strong>{uploadResult.studentCount}</strong> student applicant profiles created</li>
                        <li><strong>{uploadResult.groupCount}</strong> priority application groups configured</li>
                        <li><strong>{uploadResult.memberCount ?? '?'}</strong> group member associations verified</li>
                        {uploadResult.groupSkipped > 0 && (
                            <li style={{ color: 'var(--accent-danger)' }}><strong>{uploadResult.groupSkipped}</strong> groups skipped due to invalid block/room type preferences</li>
                        )}
                        {uploadResult.warning && (
                            <li style={{ color: 'var(--accent-danger)' }}>Warning details: {uploadResult.warning}</li>
                        )}
                    </ul>
                    {!uploadResult.warning && (
                        <div style={{ marginTop: '14px' }}>
                            <Link href="/admin/allotment" className="btn btn-success btn-sm">
                                Proceed to Allotment Engine &rarr;
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* CSV Format Reference */}
            <div className="section" style={{ marginTop: '36px' }}>
                <h2 className="section-title">Required CSV File Schema</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Header Field</th>
                                <th>Data Type</th>
                                <th>Required</th>
                                <th>Accepted Values / Sample</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['reg_no', 'String (Numeric)', 'Required', '210905001', 'Official 9-digit university student registration number'],
                                ['name', 'String', 'Required', 'Rahul Sharma', 'Full legal student name on institutional record'],
                                ['gender', 'Character', 'Required', 'M or F', 'Determines eligible hostel block inventory'],
                                ['year', 'Integer', 'Required', '2, 3, or 4', 'Current academic year of study (seniority tiebreaker)'],
                                ['department', 'String', 'Required', 'CSE, ECE, IT, ME...', 'Academic branch / department identifier'],
                                ['cgpa', 'Decimal', 'Required', '8.75', 'Cumulative Grade Point Average (0.00 – 10.00)'],
                                ['roommate_1', 'String', 'Optional', '210905002', 'Registration number of preferred roommate 1 (same gender)'],
                                ['roommate_2', 'String', 'Optional', '210905003', 'Registration number of preferred roommate 2 (same gender)'],
                                ['pref1_block', 'Integer', 'Optional', '14', 'Preferred block number for first choice'],
                                ['pref1_room_type', 'String', 'Optional', 'DAC', 'Room type code (SA, SAC, SC, DA, DAC, DC, QAC)'],
                                ['pref2_block', 'Integer', 'Optional', '15', 'Secondary block choice'],
                                ['pref2_room_type', 'String', 'Optional', 'SAC', 'Secondary room type choice'],
                            ].map(([col, type, req, ex, desc], idx) => (
                                <tr key={idx}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)' }}>{col}</td>
                                    <td>{type}</td>
                                    <td>
                                        <span className={`badge ${req === 'Required' ? 'badge-info' : 'badge-purple'}`}>
                                            {req}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{ex}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
