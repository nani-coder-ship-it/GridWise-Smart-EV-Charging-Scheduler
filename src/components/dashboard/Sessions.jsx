import React, { useState, useEffect } from 'react';
import { Filter, Download } from 'lucide-react';

const Sessions = ({ sessions }) => {
    const [filter, setFilter] = useState('All');
    const [completedSessions, setCompletedSessions] = useState([]);
    const [loadingCompleted, setLoadingCompleted] = useState(false);

    // Fetch completed sessions from the dedicated endpoint
    useEffect(() => {
        const fetchCompleted = async () => {
            setLoadingCompleted(true);
            try {
                const res = await fetch('http://localhost:5000/api/completed-sessions');
                const data = await res.json();
                setCompletedSessions(Array.isArray(data) ? data : []);
            } catch (e) {
                setCompletedSessions([]);
            } finally {
                setLoadingCompleted(false);
            }
        };
        fetchCompleted();
    }, []);

    // Merge active + completed into one pool
    const allSessions = [...(sessions || []), ...completedSessions];

    const filteredSessions = allSessions.filter(s => {
        const status = (s.status || '').toLowerCase();
        const priority = (s.priority || '').toLowerCase();
        if (filter === 'All') return true;
        if (filter === 'Active') return status === 'charging' || status === 'scheduled';
        if (filter === 'Completed') return status === 'completed';
        if (filter === 'Emergency') return priority === 'emergency';
        return true;
    });

    // CSV export of visible sessions
    const handleExportCSV = () => {
        const header = ['Vehicle ID', 'Priority', 'Start', 'End', 'Status', 'Cost (INR)'];
        const rows = filteredSessions.map(s =>
            [s.vehicle_id, s.priority, s.start_time, s.end_time, s.status, s.cost_inr]
        );
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sessions_${filter.toLowerCase()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'charging') return { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
        if (s === 'scheduled') return { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' };
        if (s === 'completed') return { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
        if (s === 'paused') return { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };
        return {};
    };

    const getBadgeStyle = (priority) => {
        const p = (priority || '').toLowerCase();
        if (p === 'emergency') return { background: '#fee2e2', color: '#b91c1c' };
        if (p === 'high') return { background: '#fef3c7', color: '#b45309' };
        return { background: '#eff6ff', color: '#2563eb' };
    };

    return (
        <div style={{ padding: '0 0 24px 0', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Charging Sessions</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', background: '#2563eb', color: 'white',
                            border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['All', 'Active', 'Completed', 'Emergency'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: 9999,
                            border: filter === f ? 'none' : '1px solid #e5e7eb',
                            background: filter === f ? '#2563eb' : 'white',
                            color: filter === f ? 'white' : '#374151',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            boxShadow: filter === f ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {f}
                        {f === 'Completed' && !loadingCompleted && (
                            <span style={{
                                marginLeft: 6, background: filter === f ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                                borderRadius: 99, padding: '1px 6px', fontSize: '0.75rem'
                            }}>
                                {completedSessions.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card table-section">
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Vehicle ID</th>
                                <th>Priority</th>
                                <th>Time Slot</th>
                                <th>Status</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCompleted && filter === 'Completed' ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                                        Loading completed sessions…
                                    </td>
                                </tr>
                            ) : filteredSessions.length > 0 ? filteredSessions.map((session, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, color: '#111827' }}>{session.vehicle_id}</td>
                                    <td>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 99,
                                            fontSize: '0.78rem', fontWeight: 600,
                                            ...getBadgeStyle(session.priority)
                                        }}>
                                            {session.priority}
                                        </span>
                                    </td>
                                    <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        {session.start_time} – {session.end_time}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 99,
                                            fontSize: '0.78rem', fontWeight: 600,
                                            ...getStatusStyle(session.status)
                                        }}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#111827' }}>₹{session.cost_inr}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                                        No sessions found for "{filter}" filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Sessions;
