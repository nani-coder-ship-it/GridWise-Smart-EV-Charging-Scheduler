import React, { useState, useEffect } from 'react';
import { Download, Trash2 } from 'lucide-react';

const Sessions = ({ sessions }) => {
    const [filter, setFilter] = useState('All');
    const [completedSessions, setCompletedSessions] = useState([]);
    const [loadingCompleted, setLoadingCompleted] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [toast, setToast] = useState(null);

    // Fetch completed sessions
    useEffect(() => {
        fetchCompleted();
    }, []);

    const fetchCompleted = async () => {
        setLoadingCompleted(true);
        try {
            const res = await fetch('http://localhost:5000/api/completed-sessions');
            const data = await res.json();
            setCompletedSessions(Array.isArray(data) ? data : []);
        } catch {
            setCompletedSessions([]);
        } finally {
            setLoadingCompleted(false);
        }
    };

    const handleDelete = async (session) => {
        if (!session.id) return;
        if (!window.confirm(`Remove completed session for ${session.vehicle_id} (${session.start_time}–${session.end_time})?`)) return;

        setDeletingId(session.id);
        try {
            const res = await fetch(`http://localhost:5000/api/sessions/${session.id}`, { method: 'DELETE' });
            if (res.ok) {
                // Optimistically remove from list
                setCompletedSessions(prev => prev.filter(s => s.id !== session.id));
                showToast(`✓ Removed session for ${session.vehicle_id}`);
            } else {
                const err = await res.json();
                showToast(`Error: ${err.error || 'Failed to delete'}`, true);
            }
        } catch {
            showToast('Network error — could not delete', true);
        } finally {
            setDeletingId(null);
        }
    };

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(null), 3000);
    };

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
        return {};
    };

    const getBadgeStyle = (priority) => {
        const p = (priority || '').toLowerCase();
        if (p === 'emergency') return { background: '#fee2e2', color: '#b91c1c' };
        if (p === 'high') return { background: '#fef3c7', color: '#b45309' };
        return { background: '#eff6ff', color: '#2563eb' };
    };

    const showDeleteCol = filter === 'Completed';

    return (
        <div style={{ padding: '0 0 24px 0', width: '100%', position: 'relative' }}>

            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    background: toast.isError ? '#fee2e2' : '#dcfce7',
                    color: toast.isError ? '#b91c1c' : '#15803d',
                    border: `1px solid ${toast.isError ? '#fca5a5' : '#86efac'}`,
                    borderRadius: 10, padding: '12px 20px',
                    fontWeight: 600, fontSize: '0.875rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Charging Sessions</h2>
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

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['All', 'Active', 'Completed', 'Emergency'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 18px', borderRadius: 9999,
                            border: filter === f ? 'none' : '1px solid #e5e7eb',
                            background: filter === f ? '#2563eb' : 'white',
                            color: filter === f ? 'white' : '#374151',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                            boxShadow: filter === f ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {f}
                        {f === 'Completed' && !loadingCompleted && (
                            <span style={{
                                marginLeft: 6, borderRadius: 99, padding: '1px 6px', fontSize: '0.75rem',
                                background: filter === f ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                            }}>
                                {completedSessions.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Helper text for completed tab */}
            {filter === 'Completed' && completedSessions.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 12 }}>
                    Completed sessions can be removed using the 🗑️ button. This also clears the original request from the system.
                </p>
            )}

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
                                {showDeleteCol && <th style={{ width: 48 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCompleted && filter === 'Completed' ? (
                                <tr>
                                    <td colSpan={showDeleteCol ? 6 : 5} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                                        Loading completed sessions…
                                    </td>
                                </tr>
                            ) : filteredSessions.length > 0 ? filteredSessions.map((session, i) => (
                                <tr key={session.id || i} style={{
                                    opacity: deletingId === session.id ? 0.4 : 1,
                                    transition: 'opacity 0.2s'
                                }}>
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
                                    {showDeleteCol && (
                                        <td>
                                            <button
                                                onClick={() => handleDelete(session)}
                                                disabled={deletingId === session.id}
                                                title="Remove completed session"
                                                style={{
                                                    background: 'none', border: '1px solid #fca5a5',
                                                    borderRadius: 7, padding: '5px 8px',
                                                    cursor: deletingId === session.id ? 'wait' : 'pointer',
                                                    color: '#ef4444', display: 'flex', alignItems: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={showDeleteCol ? 6 : 5} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
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
