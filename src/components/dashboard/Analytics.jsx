import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, ReferenceLine, Legend
} from 'recharts';
import { Activity, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

// Mock 24-hour data
const buildTimeData = () => {
    const hours = [];
    for (let h = 0; h < 24; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        const base = 40 + Math.sin((h / 24) * Math.PI * 2) * 10;
        const ev_peak = (h >= 17 && h <= 22) ? 30 + Math.random() * 20 : (Math.random() * 10);
        const utilization = Math.min(100, base + ev_peak);
        hours.push({
            time: label,
            utilization: Math.round(utilization),
            baseline: Math.round(base),
            voltage: 230 + Math.sin(h * 0.5) * 4 + (Math.random() - 0.5) * 2,
        });
    }
    return hours;
};

const data24h = buildTimeData();

// Heatmap data: 7 days x 24 hours as a flat grid
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapGrid = DAYS.map(day => {
    const row = { day };
    for (let h = 0; h < 24; h++) {
        const ev_bump = (h >= 7 && h <= 9) || (h >= 17 && h <= 22) ? 30 + Math.random() * 30 : Math.random() * 20;
        row[`h${h}`] = Math.round(Math.min(99, 30 + ev_bump));
    }
    return row;
});

const getHeatColor = (val) => {
    if (val >= 90) return '#dc2626';
    if (val >= 75) return '#f97316';
    if (val >= 55) return '#facc15';
    if (val >= 35) return '#4ade80';
    return '#e0f2fe';
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb' }}>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: '0.82rem', color: p.color }}>
                    {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                        {p.name === 'Voltage' ? ' V' : '%'}</strong>
                </p>
            ))}
        </div>
    );
};

const Analytics = ({ historyData }) => {
    const chartData = (historyData && historyData.length > 0) ? historyData : data24h;

    return (
        <div style={{ width: '100%', paddingBottom: 32 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 24px 0' }}>
                Grid Performance Analytics
            </h2>

            {/* Top 2-col charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Voltage Profile */}
                <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Activity size={18} color="#2563eb" />
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                            Voltage Stability Profile (24h)
                        </h3>
                    </div>
                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data24h}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
                                <YAxis domain={[220, 240]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={228} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Min Safe', fontSize: 10, fill: '#ef4444' }} />
                                <ReferenceLine y={235} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Nominal', fontSize: 10, fill: '#f59e0b' }} />
                                <Line type="monotone" dataKey="voltage" stroke="#2563eb" strokeWidth={2} dot={false} name="Voltage" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Avg: <strong>230.4 V</strong></span>
                        <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>Stable</span>
                    </div>
                </div>

                {/* Peak Load Events */}
                <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                            Peak Load Events (24h)
                        </h3>
                    </div>
                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data24h}>
                                <defs>
                                    <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Alert Zone', fontSize: 10, fill: '#ef4444', position: 'insideTopLeft' }} />
                                <Area type="monotone" dataKey="utilization" stroke="#ef4444" strokeWidth={2} fill="url(#utilGrad)" name="Utilization" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 8 }}>
                        <strong style={{ color: '#ef4444' }}>3 events</strong> exceeded 85% capacity. AI load shedding prevented outages.
                    </div>
                </div>
            </div>

            {/* Heatmap: 7-day transformer utilization */}
            <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Zap size={18} color="#7c3aed" />
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                        Transformer Utilization Trend — 7 Day Heatmap
                    </h3>
                </div>

                {/* Hour labels */}
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 640 }}>
                        <div style={{ display: 'flex', marginLeft: 36, marginBottom: 4 }}>
                            {Array.from({ length: 24 }, (_, h) => (
                                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af', minWidth: 20 }}>
                                    {h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''}
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        {heatmapGrid.map((row) => (
                            <div key={row.day} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                                <div style={{ width: 30, fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>
                                    {row.day}
                                </div>
                                {Array.from({ length: 24 }, (_, h) => {
                                    const val = row[`h${h}`];
                                    return (
                                        <div
                                            key={h}
                                            title={`${row.day} ${String(h).padStart(2, '0')}:00 — ${val}%`}
                                            style={{
                                                flex: 1,
                                                height: 22,
                                                background: getHeatColor(val),
                                                borderRadius: 3,
                                                margin: '0 1px',
                                                minWidth: 18,
                                                cursor: 'default',
                                                transition: 'transform 0.1s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    );
                                })}
                            </div>
                        ))}

                        {/* Legend */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Low</span>
                            {['#e0f2fe', '#4ade80', '#facc15', '#f97316', '#dc2626'].map((c, i) => (
                                <div key={i} style={{ width: 18, height: 14, background: c, borderRadius: 3 }} />
                            ))}
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>High</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
