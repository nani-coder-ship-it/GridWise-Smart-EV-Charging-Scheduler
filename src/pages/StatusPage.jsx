// src/pages/StatusPage.jsx
// Minimal standalone page at /status?v=<vehicle_id>
// Auto-runs the status lookup on mount using the URL query param.
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    Search, Clock, Zap, CheckCircle2, AlertCircle,
    BatteryCharging, Leaf, DollarSign, Timer, ArrowLeft
} from 'lucide-react';

import { API_BASE as API } from '../api';

const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '--';

const minsToHM = (mins) => {
    if (mins == null) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const StatusBadge = ({ status }) => {
    const configs = {
        Scheduled: { color: '#1565C0', bg: '#EFF6FF', label: 'Scheduled' },
        Charging: { color: '#1B5E20', bg: '#DCFCE7', label: '⚡ Charging' },
        Completed: { color: '#4B5563', bg: '#F3F4F6', label: '✓ Completed' },
        Pending: { color: '#92400E', bg: '#FEF9C3', label: 'Pending' },
    };
    const cfg = configs[status] || configs.Pending;
    return (
        <span style={{
            background: cfg.bg,
            color: cfg.color,
            borderRadius: 20,
            padding: '4px 14px',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
        }}>
            {status === 'Charging' && (
                <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#16a34a',
                    display: 'inline-block',
                    animation: 'spulse 1.2s infinite',
                }} />
            )}
            {cfg.label}
        </span>
    );
};

const StatusPage = () => {
    const [searchParams] = useSearchParams();
    const vehicleId = searchParams.get('v') || '';

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [liveRemaining, setLiveRemaining] = useState(null);
    const [liveEnergy, setLiveEnergy] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => () => clearInterval(timerRef.current), []);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (!result || result.status !== 'Charging') return;
        const tick = () => {
            const now = new Date();
            const end = new Date(result.scheduled_end);
            const start = new Date(result.scheduled_start);
            const remaining = Math.max(0, Math.round((end - now) / 60000));
            const elapsed = Math.max(0, (now - start) / 3600000);
            const energy = Math.min(result.charger_power_kw * elapsed, result.total_required_kwh);
            setLiveRemaining(remaining);
            setLiveEnergy(parseFloat(energy.toFixed(3)));
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, [result]);

    const lookup = async (id) => {
        if (!id) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await fetch(`${API}/charging-status/${encodeURIComponent(id)}`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'No session found for this Vehicle ID.');
            } else {
                setResult(data);
            }
        } catch {
            setError('Could not connect to the server. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-lookup on mount
    useEffect(() => {
        if (vehicleId) lookup(vehicleId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleId]);

    const displayEnergy = liveEnergy ?? result?.energy_delivered_kwh ?? 0;
    const displayRemaining = liveRemaining ?? result?.time_remaining_minutes ?? null;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 16px',
        }}>
            {/* Header */}
            <div style={{ width: '100%', maxWidth: 520, marginBottom: 24 }}>
                <Link to="/" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none',
                }}>
                    <ArrowLeft size={16} /> Back to GridWise
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1B5E20, #0D47A1)',
                        borderRadius: 10, padding: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Zap size={22} color="#fff" fill="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', color: 'var(--primary-dark)', marginBottom: 0 }}>
                            Charging Status
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                            GridWise Smart EV Charging
                        </p>
                    </div>
                </div>
            </div>

            {/* Vehicle ID pill */}
            {vehicleId && (
                <div style={{
                    width: '100%', maxWidth: 520,
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: 10, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 16, boxShadow: 'var(--shadow-sm)',
                }}>
                    <BatteryCharging size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Vehicle ID:</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '1rem' }}>
                        {vehicleId}
                    </strong>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 30, color: 'var(--text-secondary)' }}>
                    <span className="sl-spinner" style={{ width: 24, height: 24 }} />
                    <span>Looking up session…</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={{
                    width: '100%', maxWidth: 520,
                    background: '#FFF5F5', border: '1px solid #FCA5A5',
                    borderRadius: 12, padding: '24px 20px', textAlign: 'center',
                }}>
                    <AlertCircle size={38} color="#EF4444" style={{ marginBottom: 8 }} />
                    <p style={{ color: '#991B1B', fontWeight: 600, marginBottom: 4 }}>{error}</p>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
                        Double-check the vehicle ID and try again.
                    </p>
                </div>
            )}

            {/* Result card */}
            {result && !error && (
                <div style={{
                    width: '100%', maxWidth: 520,
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
                }}>
                    {/* Top accent strip */}
                    <div style={{
                        height: 4,
                        background: result.status === 'Charging'
                            ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                            : result.status === 'Completed'
                                ? 'linear-gradient(90deg, #6B7280, #9CA3AF)'
                                : 'linear-gradient(90deg, #1565C0, #60A5FA)',
                    }} />

                    <div style={{ padding: '20px 22px' }}>
                        {/* Card top */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                                    {result.vehicle_id}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                    {result.charger_type || 'AC'} Charger
                                    {result.charger_power_kw ? ` · ${result.charger_power_kw} kW` : ''}
                                </div>
                            </div>
                            <StatusBadge status={result.status} />
                        </div>

                        {/* Details grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            gap: 12, marginBottom: 16,
                        }}>
                            {[
                                ['Scheduled Start', `${fmtDate(result.scheduled_start)} ${fmtTime(result.scheduled_start)}`],
                                ['Scheduled End', `${fmtDate(result.scheduled_end)} ${fmtTime(result.scheduled_end)}`],
                                ['Est. Completion', fmtTime(result.estimated_completion)],
                                result.status === 'Charging'
                                    ? ['Time Remaining', minsToHM(displayRemaining)]
                                    : result.total_cost != null
                                        ? ['Total Cost', `₹${result.total_cost.toFixed(2)}`]
                                        : result.estimated_cost != null
                                            ? ['Est. Cost', `₹${result.estimated_cost.toFixed(2)}`]
                                            : null,
                            ].filter(Boolean).map(([label, value]) => (
                                <div key={label} style={{
                                    background: 'var(--surface-hover, #F9FAFB)',
                                    borderRadius: 8, padding: '10px 12px',
                                }}>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Energy bar */}
                        {result.total_required_kwh > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{
                                    height: 8, borderRadius: 99, background: 'var(--surface-hover, #E5E7EB)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (displayEnergy / result.total_required_kwh) * 100)}%`,
                                        background: result.status === 'Completed'
                                            ? '#6B7280'
                                            : 'linear-gradient(90deg, #16a34a, #4ade80)',
                                        borderRadius: 99,
                                        transition: 'width 0.5s',
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        ⚡ {displayEnergy.toFixed(2)} kWh
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {((displayEnergy / result.total_required_kwh) * 100).toFixed(0)}% of {result.total_required_kwh.toFixed(2)} kWh
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Footer badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {result.peak_optimized && (
                                <span style={{
                                    background: '#EFF6FF', color: '#1565C0',
                                    borderRadius: 20, padding: '3px 10px',
                                    fontSize: '0.75rem', fontWeight: 600,
                                }}>
                                    ⚡ Off-Peak Optimized
                                </span>
                            )}
                            {(result.carbon_savings_kg || 0) > 0 && (
                                <span style={{
                                    background: '#DCFCE7', color: '#166534',
                                    borderRadius: 20, padding: '3px 10px',
                                    fontSize: '0.75rem', fontWeight: 600,
                                }}>
                                    🌿 {result.carbon_savings_kg} kg CO₂ saved
                                </span>
                            )}
                            {result.status === 'Charging' && (
                                <span style={{
                                    background: '#DCFCE7', color: '#16a34a',
                                    borderRadius: 20, padding: '3px 10px',
                                    fontSize: '0.75rem', fontWeight: 700,
                                }}>
                                    ● LIVE
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* No vehicle id message */}
            {!vehicleId && !loading && (
                <div style={{
                    width: '100%', maxWidth: 520, textAlign: 'center',
                    padding: '40px 20px', color: 'var(--text-secondary)',
                }}>
                    <Search size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p>No Vehicle ID provided. <Link to="/resident">Go to Resident Panel</Link>.</p>
                </div>
            )}

            <style>{`
                @keyframes spulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
};

export default StatusPage;
