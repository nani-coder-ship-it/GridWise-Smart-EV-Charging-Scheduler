import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Card, { CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SlotSuggestions from '../components/SlotSuggestions';
import { BatteryCharging, CheckCircle2, Zap, ArrowRight, Leaf, AlertTriangle } from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './ResidentPanel.css';

const API = 'http://localhost:5000/api';

const ResidentPanel = () => {
    const { submissionResult } = useGrid();
    const [formData, setFormData] = useState({
        vehicleId: '',
        currentBattery: '',
        targetBattery: '80',
        departureTime: '',
        chargerType: 'AC',
        priority: 'normal',
        batteryCapacity: '60',
    });

    const [requestStatus, setRequestStatus] = useState(null); // null | 'loading' | 'suggesting' | 'scheduled' | 'error'
    const [schedule, setSchedule] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    // Progress tracking
    const [progress, setProgress] = useState(0);
    const [statusLabel, setStatusLabel] = useState('Scheduled');

    React.useEffect(() => {
        if (!schedule) return;
        const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const update = () => {
            const now = new Date();
            const start = new Date(schedule.startTime);
            const end = new Date(schedule.endTime);
            if (now < start) {
                setProgress(0);
                setStatusLabel(`Scheduled for ${fmt(schedule.startTime)}`);
            } else if (now >= start && now <= end) {
                const pct = Math.min(100, ((now - start) / (end - start)) * 100);
                setProgress(pct);
                setStatusLabel(`⚡ Charging… ${Math.round(pct)}%`);
            } else {
                setProgress(100);
                setStatusLabel('Completed');
            }
        };
        update();
        const t = setInterval(update, 10000);
        return () => clearInterval(t);
    }, [schedule]);

    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let v = value;
        if (name === 'currentBattery' || name === 'targetBattery') {
            const n = parseInt(value, 10);
            if (n > 100) v = '100'; else if (n < 0) v = '0';
        }
        setFormData(prev => ({ ...prev, [name]: v }));
    };

    /* ── Step 1: Fetch suggestions first ────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setRequestStatus('suggesting');
        try {
            const res = await fetch(`${API}/suggest-slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle_id: formData.vehicleId || 'EV-USER',
                    current_battery: parseFloat(formData.currentBattery),
                    target_battery: parseFloat(formData.targetBattery),
                    battery_capacity: parseFloat(formData.batteryCapacity),
                    departure_time: new Date(formData.departureTime).toISOString(),
                    charger_type: formData.chargerType,
                    priority: formData.priority,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch suggestions');
            setSuggestions(data.suggestions || []);
            // Keep status as 'suggesting' to show the modal
        } catch (err) {
            setErrorMsg(err.message);
            setRequestStatus('error');
        }
    };

    /* ── Step 2: User picks a suggested slot ─────────────── */
    const handleBookSlot = async (slot) => {
        // Build ISO start time from slot.start (HH:MM) — treat as today UTC
        const [hh, mm] = slot.start.split(':').map(Number);
        const startDt = new Date();
        startDt.setUTCHours(hh, mm, 0, 0);
        const preferredIso = startDt.toISOString();

        const res = await fetch(`${API}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicle_id: formData.vehicleId || 'EV-USER',
                current_battery: parseFloat(formData.currentBattery),
                target_battery: parseFloat(formData.targetBattery),
                battery_capacity: parseFloat(formData.batteryCapacity),
                departure_time: new Date(formData.departureTime).toISOString(),
                charger_type: formData.chargerType,
                priority: formData.priority,
                preferred_slot: preferredIso,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Booking failed');
        setSchedule(data.schedule);
        setRequestStatus('scheduled');
        setSuggestions([]);
    };

    const handleDismissSuggestions = () => {
        setSuggestions([]);
        setRequestStatus(null);
    };

    const showSuggestions = suggestions.length > 0 && requestStatus !== 'scheduled';

    return (
        <div className="resident-page">
            {/* Slot suggestions modal */}
            {showSuggestions && (
                <SlotSuggestions
                    suggestions={suggestions}
                    onBook={handleBookSlot}
                    onDismiss={handleDismissSuggestions}
                    loading={false}
                />
            )}

            <div className="container">
                <header className="page-header">
                    <h1 className="page-title">Resident Charging Portal</h1>
                    <p className="page-subtitle">Manage your EV charging with smart, predictive scheduling.</p>
                </header>

                <div className="resident-grid">
                    {/* ── Request Form ── */}
                    <div className="form-section">
                        <Card className="request-card">
                            <CardContent>
                                <div className="card-header-internal">
                                    <div className="icon-wrapper"><BatteryCharging className="icon-main" /></div>
                                    <div>
                                        <CardTitle>New Charging Request</CardTitle>
                                        <p className="card-desc">AI finds the best slot — or suggests 3 smart alternatives.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    {/* Vehicle ID */}
                                    <div className="input-wrapper mb-4">
                                        <label className="input-label">Vehicle ID</label>
                                        <input
                                            className="input-field"
                                            name="vehicleId"
                                            placeholder="e.g. EV-001"
                                            value={formData.vehicleId}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <Input
                                            label="Current Battery (%)"
                                            name="currentBattery"
                                            type="number"
                                            placeholder="e.g. 20"
                                            min="0" max="100"
                                            value={formData.currentBattery}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <Input
                                            label="Target Battery (%)"
                                            name="targetBattery"
                                            type="number"
                                            placeholder="e.g. 80"
                                            min="0" max="100"
                                            value={formData.targetBattery}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <Input
                                            label="Battery Capacity (kWh)"
                                            name="batteryCapacity"
                                            type="number"
                                            placeholder="1–200 kWh (scooter–car)"
                                            min="1" max="200"
                                            value={formData.batteryCapacity}
                                            onChange={handleInputChange}
                                        />
                                        <div className="input-wrapper">
                                            <label className="input-label">Charger Type</label>
                                            <select className="input-field" name="chargerType" value={formData.chargerType} onChange={handleInputChange}>
                                                <option value="AC">AC Standard (7 kW)</option>
                                                <option value="DC">DC Fast Charge (50 kW)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Input
                                        label="Departure Time"
                                        name="departureTime"
                                        type="datetime-local"
                                        value={formData.departureTime}
                                        onChange={handleInputChange}
                                        required
                                    />

                                    <div className="input-wrapper">
                                        <label className="input-label">Priority Level</label>
                                        <select className="input-field" name="priority" value={formData.priority} onChange={handleInputChange}>
                                            <option value="flexible">Flexible (Lowest Cost)</option>
                                            <option value="normal">Normal</option>
                                            <option value="emergency">Emergency (Immediate)</option>
                                        </select>
                                    </div>

                                    {errorMsg && (
                                        <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginTop: 12 }}>
                                            ⚠ {errorMsg}
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full mt-4" disabled={requestStatus === 'suggesting'}>
                                        {requestStatus === 'suggesting' ? '🔍 Analysing Smart Slots…' : '✨ Get Smart Slot Suggestions'}
                                        {!requestStatus && <ArrowRight size={18} />}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Status / Output ── */}
                    <div className="status-section">
                        {requestStatus === 'scheduled' && schedule ? (
                            <div className="schedule-results">
                                <Card className="status-card success">
                                    <CardContent>
                                        <div className="status-header">
                                            <CheckCircle2 className="status-icon" size={32} />
                                            <div>
                                                <h3>Charging Scheduled</h3>
                                                <p>AI has optimized your slot for peak efficiency.</p>
                                            </div>
                                        </div>
                                        <div className="schedule-details">
                                            <div className="detail-item"><span className="label">Start Time</span><span className="value">{formatTime(schedule.startTime)}</span></div>
                                            <div className="detail-item"><span className="label">End Time</span><span className="value">{formatTime(schedule.endTime)}</span></div>
                                            <div className="detail-item"><span className="label">Duration</span><span className="value">{schedule.duration}</span></div>
                                        </div>

                                        {/* Partial charge warning */}
                                        {schedule.partialCharge && (
                                            <div style={{
                                                margin: '12px 0', padding: '10px 14px',
                                                background: '#fffbeb', border: '1px solid #fcd34d',
                                                borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start'
                                            }}>
                                                <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                                                <div style={{ fontSize: '0.82rem', color: '#92400e' }}>
                                                    <strong>Partial charge only</strong> — not enough time before departure.<br />
                                                    Battery will reach <strong>~{schedule.achievableBattery}%</strong> by your departure time.
                                                    Consider DC Fast Charge or extending your departure window.
                                                </div>
                                            </div>
                                        )}

                                        <div className="cost-box">
                                            <div className="cost-row"><span>Estimated Cost</span><span className="cost-value">{schedule.cost}</span></div>
                                            <div className="cost-row savings"><span>Peak Avoidance Savings</span><span className="save-value">-{schedule.savings}</span></div>
                                        </div>
                                    </CardContent>

                                    {submissionResult?.insight && (
                                        <div className={`notification-box ${submissionResult.insight.type}`}>
                                            <div className="flex gap-2 items-start">
                                                <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-bold text-sm uppercase mb-1">Smart Grid Alert</h4>
                                                    <p className="text-sm">{submissionResult.insight.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="eco-impact-section">
                                        <div className="eco-metric">
                                            <Leaf size={18} className="text-green-600" />
                                            <span>Carbon Emission Reduced: <strong>{schedule.carbonReduced}</strong></span>
                                        </div>
                                        {schedule.isOffPeak && (
                                            <div className="eco-badge">
                                                <Zap size={14} fill="currentColor" /> Optimized to Off-Peak Tariff
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="charging-progress-container mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-gray-700">Charging Progress</span>
                                            <span className={`font-bold ${progress === 100 ? 'text-green-600' : progress > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>Current: {formData.currentBattery}%</span>
                                            <span>Target: {schedule.partialCharge ? `~${schedule.achievableBattery}%` : `${formData.targetBattery}%`}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-graphic"><Zap size={48} className="empty-icon" /></div>
                                <h3 className="text-gray-700 font-bold mb-2">No Active Session</h3>
                                <p className="text-gray-500 text-sm">
                                    Submit a request — our AI will suggest the best charging slot based on grid load, solar availability, and cost.
                                </p>

                                {/* Smart slot explainer */}
                                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { icon: '☀️', label: 'Solar Optimized', desc: 'Uses peak solar window (10AM–2PM)' },
                                        { icon: '💰', label: 'Lowest Cost', desc: 'Cheapest off-peak tariff window' },
                                        { icon: '🛡️', label: 'Grid Safe', desc: 'Lowest transformer utilisation' },
                                    ].map(({ icon, label, desc }) => (
                                        <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: '8px 14px', border: '1px solid #e5e7eb' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{label}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResidentPanel;
