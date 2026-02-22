import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Clock, Zap, CheckCircle2, AlertCircle,
    BatteryCharging, Leaf, DollarSign, Timer, RotateCcw, XCircle
} from 'lucide-react';
import VehicleQRCode from './ui/VehicleQRCode';

import { API_BASE as API } from '../api';

/* ── Helpers ── */
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

/* ── Status Badge ── */
const StatusBadge = ({ status }) => {
    const configs = {
        Scheduled: { cls: 'badge-scheduled', icon: <Clock size={13} />, label: 'Scheduled' },
        Charging: { cls: 'badge-charging', icon: <Zap size={13} fill="currentColor" />, label: 'Charging' },
        Completed: { cls: 'badge-completed', icon: <CheckCircle2 size={13} />, label: 'Completed' },
        Pending: { cls: 'badge-pending', icon: <Timer size={13} />, label: 'Pending' },
    };
    const cfg = configs[status] || configs.Pending;
    return (
        <span className={`status-lookup-badge ${cfg.cls}`}>
            {status === 'Charging' && <span className="badge-pulse" />}
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

/* ── Energy Progress Bar ── */
const EnergyBar = ({ delivered, total, status }) => {
    const pct = total > 0 ? Math.min(100, (delivered / total) * 100) : 0;
    return (
        <div className="sl-energy-bar-wrap">
            <div className="sl-energy-bar-track">
                <div
                    className={`sl-energy-bar-fill ${status === 'Completed' ? 'fill-done' : 'fill-active'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="sl-energy-bar-labels">
                <span>⚡ {delivered.toFixed(2)} kWh delivered</span>
                <span>{pct.toFixed(0)}% of {total.toFixed(2)} kWh</span>
            </div>
        </div>
    );
};

/* ── MAIN COMPONENT ── */
const ChargingStatusLookup = () => {
    const [vehicleId, setVehicleId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);   // API response
    const [error, setError] = useState('');

    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState('');
    const [liveRemaining, setLiveRemaining] = useState(null);
    const [liveEnergy, setLiveEnergy] = useState(null);
    const timerRef = useRef(null);

    /* Clear timer on unmount */
    useEffect(() => () => clearInterval(timerRef.current), []);

    /* Start / restart live ticker whenever result changes */
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

        tick(); // immediate
        timerRef.current = setInterval(tick, 1000);
    }, [result]);

    const handleCancel = async () => {
        if (!result?.vehicle_id) return;
        setCancelling(true);
        try {
            const res = await fetch(`${API}/charging-status/${encodeURIComponent(result.vehicle_id)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok) {
                setCancelSuccess(`Session for ${result.vehicle_id} cancelled successfully.`);
                setResult(null);
                setCancelConfirm(false);
            } else {
                setError(data.error || 'Could not cancel session.');
                setCancelConfirm(false);
            }
        } catch {
            setError('Network error while cancelling.');
            setCancelConfirm(false);
        } finally {
            setCancelling(false);
        }
    };

    const handleLookup = async (e) => {
        e.preventDefault();
        const id = vehicleId.trim();
        if (!id) return;
        setLoading(true);
        setError('');
        setResult(null);
        setLiveRemaining(null);
        setLiveEnergy(null);

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

    const handleReset = () => {
        setResult(null);
        setError('');
        setVehicleId('');
        setCancelSuccess('');
        setCancelConfirm(false);
        clearInterval(timerRef.current);
    };

    const displayEnergy = liveEnergy ?? result?.energy_delivered_kwh ?? 0;
    const displayRemaining = liveRemaining ?? result?.time_remaining_minutes ?? null;

    return (
        <section className="sl-section">
            {/* Section header */}
            <div className="sl-section-header">
                <div className="sl-header-icon"><Search size={20} /></div>
                <div>
                    <h2 className="sl-title">Check Charging Status</h2>
                    <p className="sl-subtitle">Enter your Vehicle ID to instantly look up your latest session — no login required.</p>
                </div>
            </div>

            {/* Search bar */}
            <form className="sl-search-row" onSubmit={handleLookup}>
                <div className="sl-input-wrap">
                    <BatteryCharging className="sl-input-icon" size={18} />
                    <input
                        className="sl-input"
                        type="text"
                        placeholder="e.g. EV-001"
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <button className="sl-btn-lookup" type="submit" disabled={loading || !vehicleId.trim()}>
                    {loading ? <span className="sl-spinner" /> : <><Search size={16} /> Check Status</>}
                </button>
                {(result || error) && (
                    <button type="button" className="sl-btn-reset" onClick={handleReset} title="New search">
                        <RotateCcw size={15} />
                    </button>
                )}
            </form>

            {/* Cancel success banner */}
            {cancelSuccess && (
                <div className="sl-cancel-success">
                    <CheckCircle2 size={16} />
                    {cancelSuccess}
                    <button className="sl-btn-reset" onClick={handleReset} style={{ marginLeft: 'auto' }}><RotateCcw size={13} /></button>
                </div>
            )}

            {/* Error / not-found */}
            {error && !loading && (
                <div className="sl-not-found">
                    <AlertCircle size={38} className="sl-nf-icon" />
                    <p className="sl-nf-text">{error}</p>
                    <p className="sl-nf-hint">Double-check your Vehicle ID and try again.</p>
                </div>
            )}

            {/* Result card */}
            {result && !error && (
                <div className={`sl-result-card sl-card-${result.status.toLowerCase()}`}>
                    {/* Top strip */}
                    <div className="sl-card-top">
                        <div>
                            <div className="sl-vehicle-id">{result.vehicle_id}</div>
                            <div className="sl-charger-type">
                                {result.charger_type || 'AC'} Charger
                                {result.charger_power_kw ? ` · ${result.charger_power_kw} kW` : ''}
                            </div>
                        </div>
                        <StatusBadge status={result.status} />
                    </div>

                    {/* Time details grid */}
                    <div className="sl-details-grid">
                        <div className="sl-detail-item">
                            <span className="sl-detail-label">Scheduled Start</span>
                            <span className="sl-detail-value">
                                {fmtDate(result.scheduled_start)} &nbsp;
                                <strong>{fmtTime(result.scheduled_start)}</strong>
                            </span>
                        </div>
                        <div className="sl-detail-item">
                            <span className="sl-detail-label">Scheduled End</span>
                            <span className="sl-detail-value">
                                {fmtDate(result.scheduled_end)} &nbsp;
                                <strong>{fmtTime(result.scheduled_end)}</strong>
                            </span>
                        </div>
                        <div className="sl-detail-item">
                            <span className="sl-detail-label">Est. Completion</span>
                            <span className="sl-detail-value">
                                <strong>{fmtTime(result.estimated_completion)}</strong>
                            </span>
                        </div>

                        {/* Time remaining — only when Charging */}
                        {result.status === 'Charging' && (
                            <div className="sl-detail-item sl-highlight-item">
                                <span className="sl-detail-label"><Timer size={13} style={{ display: 'inline', marginRight: 4 }} />Time Remaining</span>
                                <span className="sl-detail-value sl-time-remaining">
                                    {minsToHM(displayRemaining)}
                                </span>
                            </div>
                        )}

                        {/* Cost — estimated while not completed, final when completed */}
                        {result.status === 'Completed' && result.total_cost != null && (
                            <div className="sl-detail-item sl-highlight-item">
                                <span className="sl-detail-label"><DollarSign size={13} style={{ display: 'inline', marginRight: 4 }} />Total Cost</span>
                                <span className="sl-detail-value sl-cost-final">₹{result.total_cost.toFixed(2)}</span>
                            </div>
                        )}
                        {result.status !== 'Completed' && result.estimated_cost != null && (
                            <div className="sl-detail-item">
                                <span className="sl-detail-label">Estimated Cost</span>
                                <span className="sl-detail-value">₹{result.estimated_cost.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Energy progress bar */}
                    {result.total_required_kwh > 0 && (
                        <EnergyBar
                            delivered={displayEnergy}
                            total={result.total_required_kwh}
                            status={result.status}
                        />
                    )}

                    {/* Cancel section — only when Scheduled */}
                    {result.status === 'Scheduled' && (
                        <div className="sl-cancel-section">
                            {!cancelConfirm ? (
                                <button
                                    className="sl-btn-cancel"
                                    onClick={() => setCancelConfirm(true)}
                                >
                                    <XCircle size={15} /> Cancel Session
                                </button>
                            ) : (
                                <div className="sl-cancel-confirm">
                                    <span>Are you sure you want to cancel this session?</span>
                                    <button
                                        className="sl-btn-cancel-yes"
                                        onClick={handleCancel}
                                        disabled={cancelling}
                                    >
                                        {cancelling ? '...' : 'Yes, Cancel'}
                                    </button>
                                    <button
                                        className="sl-btn-cancel-no"
                                        onClick={() => setCancelConfirm(false)}
                                        disabled={cancelling}
                                    >
                                        Keep It
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer row */}
                    <div className="sl-card-footer">
                        {result.peak_optimized && (
                            <span className="sl-eco-badge"><Zap size={12} fill="currentColor" /> Off-Peak Optimized</span>
                        )}
                        {result.carbon_savings_kg > 0 && (
                            <span className="sl-eco-badge sl-eco-green">
                                <Leaf size={12} /> {result.carbon_savings_kg} kg CO₂ saved
                            </span>
                        )}
                        {result.status === 'Charging' && (
                            <span className="sl-live-tag">● LIVE</span>
                        )}
                    </div>

                    {/* QR Code section */}
                    <div className="sl-qr-section">
                        <VehicleQRCode vehicleId={result.vehicle_id} />
                    </div>
                </div>
            )}
        </section>
    );
};

export default ChargingStatusLookup;
