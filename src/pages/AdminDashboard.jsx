import React, { useState } from 'react';
import Card, { CardTitle, CardContent } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceArea, Legend } from 'recharts';
import { Activity, Zap, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Shield, Lock, Unlock, Clock } from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { sessions, stats, historyData, logs, refreshData } = useGrid();
    const [showAllLogs, setShowAllLogs] = useState(false); // Log history toggle

    // Ensure fresh data on mount (Real-Time Sync)
    React.useEffect(() => {
        refreshData();
    }, []);

    // Helper for safe number display
    const safeNum = (val) => val ? Number(val).toFixed(0) : '0';
    const safeFloat = (val) => val ? Number(val).toFixed(1) : '0.0';
    const formatCurrency = (val) => val ? `₹${Number(val).toFixed(2)}` : '₹0.00';

    return (
        <div className="admin-page">
            <div className="container mx-auto px-4">
                <div className="dashboard-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                            <div className="hidden md:flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <Activity size={12} /> Grid Protection Active
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                                    <Zap size={12} /> Load Balanced by AI
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-500">Real-time Grid Orchestration & Smart Charging Control</p>
                    </div>
                    <div className="status-badge">
                        <div className="live-dot"></div>
                        System Online
                    </div>
                </div>

                {/* Top Stats */}
                <div className="stats-grid-admin">
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper blue">
                            <Zap size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Transformer Load</span>
                            <span className="stat-value">{safeNum(stats.transformerUtilization)}%</span>
                            <span className={`stat-trend ${stats.stressLevel === 'Critical' ? 'negative' : stats.stressLevel === 'Warning' ? 'warning' : 'neutral'}`}>
                                {stats.stressLevel || 'Stable'}
                            </span>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper green">
                            <Activity size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Sustainability Impact</span>
                            <div className="flex flex-col">
                                <span className="stat-value text-lg">{formatCurrency(stats.costSaved)} Saved</span>
                                <span className="stat-value text-sm text-green-600 font-medium">Today's CO₂ Saved: {safeFloat(stats.carbonSaved)} kg</span>
                            </div>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper orange">
                            <Zap size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Active Load Split</span>
                            <div className="flex gap-3 mt-1">
                                <div className="text-center">
                                    <span className="block font-bold text-lg">{safeFloat(stats.acLoad)}kW</span>
                                    <span className="text-xs text-gray-500">AC Level 2</span>
                                </div>
                                <div className="w-px bg-gray-300"></div>
                                <div className="text-center">
                                    <span className="block font-bold text-lg text-orange-600">{safeFloat(stats.dcLoad)}kW</span>
                                    <span className="text-xs text-gray-500">DC Fast</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper purple">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Peak Prediction</span>
                            <span className="stat-value text-lg">{stats.peakPrediction || '--:--'}</span>
                            <span className="stat-trend">Forecast</span>
                        </div>
                    </Card>
                </div>

                {/* Grid Stress Alert Banner */}
                {(stats.stressLevel === 'Critical' || stats.stressLevel === 'Warning') && (
                    <div className={`alert-banner ${stats.stressLevel.toLowerCase()} mb-6 p-4 rounded-lg flex items-center gap-3 border`}>
                        <AlertTriangle size={24} />
                        <div>
                            <h3 className="font-bold">Grid Stress {stats.stressLevel}!</h3>
                            <p>High load detected. Flexible charging sessions are being delayed to prevent outage.</p>
                        </div>
                    </div>
                )}

                <div className="dashboard-main-grid">
                    {/* Load Graph */}
                    <div className="chart-section">
                        <Card className="chart-card">
                            <div className="card-header-flex">
                                <CardTitle>Real-Time Load Analysis</CardTitle>
                                <div className="legend">
                                    <span className="legend-item"><span className="dot raw"></span> Raw Load</span>
                                    <span className="legend-item"><span className="dot optimized"></span> AI Optimized</span>
                                </div>
                            </div>
                            <CardContent className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const raw = payload.find(p => p.dataKey === 'raw_load')?.value;
                                                    const opt = payload.find(p => p.dataKey === 'optimized_load')?.value;
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                                                            <p className="font-bold text-gray-700 mb-2">{label}</p>
                                                            <div className="space-y-1 text-sm">
                                                                <p className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Raw Load: {raw} kW</p>
                                                                <p className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Optimized: {opt} kW</p>
                                                                {label >= "18:00" && label <= "22:00" && (
                                                                    <p className="text-red-500 text-xs font-bold mt-1">⚠️ Peak Tariff Zone</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />

                                        {/* Peak Zone Highlight */}
                                        <ReferenceArea
                                            x1="18:00"
                                            x2="22:00"
                                            stroke="red"
                                            strokeOpacity={0.3}
                                            strokeDasharray="3 3"
                                            fill="#fee2e2"
                                            fillOpacity={0.4}
                                            label={{
                                                value: "Peak Rate Zone",
                                                position: 'insideTopLeft',
                                                fill: '#991b1b',
                                                fontSize: 12,
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="raw_load"
                                            stroke="#3b82f6"
                                            fillOpacity={1}
                                            fill="url(#colorLoad)"
                                            strokeWidth={2}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="optimized_load"
                                            stroke="#22c55e"
                                            fillOpacity={1}
                                            fill="url(#colorOptimized)"
                                            strokeWidth={2}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* AI Panel */}
                        <Card className="ai-panel">
                            <CardTitle className="mb-4 flex-center-start gap-2">
                                <Zap size={20} className="text-yellow-500" /> AI Optimization Insights
                            </CardTitle>

                            {/* Grid Capacity Bar */}
                            <div className="capacity-section mb-6">
                                <div className="capacity-header flex justify-between text-sm mb-2">
                                    <span className="font-medium">Transformer Utilization</span>
                                    <span>Used: <span className="font-bold">{safeNum(stats.transformerUtilization)}%</span> | Available: <span className="text-green-600 font-bold">{(100 - (stats.transformerUtilization || 0)).toFixed(1)}%</span></span>
                                </div>
                                <div className="capacity-bar-bg">
                                    <div
                                        className={`capacity-bar-fill ${stats.stressLevel === 'Critical' ? 'critical' : stats.stressLevel === 'Moderate' ? 'moderate' : 'normal'}`}
                                        style={{ width: `${Math.min(100, stats.transformerUtilization || 0)}%` }}
                                    ></div>
                                </div>
                            </div>


                            {/* Peak Warning Indicator */}
                            {stats.totalLoad > 80 && (
                                <div className="peak-warning-badge mb-4">
                                    <AlertTriangle size={18} />
                                    <span><strong>Warning:</strong> Transformer Stress Risk Detected</span>
                                </div>
                            )}

                            {/* New AI Insight Box */}
                            <div className="ai-insight-box">
                                <div className="insight-header">
                                    <span className="insight-label">AI Recommendation</span>
                                </div>
                                <p className="insight-text">
                                    {stats.recommendation || "System optimal. No load shifting required."}
                                </p>
                            </div>

                            <div className="insight-divider my-4"></div>

                            <div className="insight-item">
                                <div className="insight-icon bg-green-100 text-green-700"><TrendingUp size={18} /></div>
                                <div>
                                    <h4>Efficiency Recommendation</h4>
                                    <p>Shift 15% of flexible loads to 02:00 AM window to maximize renewable intake.</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Schedule Table */}
                    <div className="table-section">
                        <Card className="h-full">
                            <CardTitle className="p-4 border-b">Active Charging Schedule</CardTitle>
                            <div className="table-wrapper">
                                <table className="schedule-table">
                                    <thead>
                                        <tr>
                                            <th>Vehicle ID</th>
                                            <th>Priority</th>
                                            <th>Allocated Slot</th>
                                            <th>Status</th>
                                            <th>Est. Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.length > 0 ? (
                                            sessions.map((session, index) => (
                                                <tr key={index}>
                                                    <td className="font-medium">{session.vehicle_id}</td>
                                                    <td>
                                                        <span className={`badge badge-${session.priority.toLowerCase()}`}>
                                                            {session.priority}
                                                        </span>
                                                    </td>
                                                    <td>{session.start_time} - {session.end_time}</td>
                                                    <td>
                                                        <span className={`status-text status-${session.status.toLowerCase()}`}>
                                                            {session.status}
                                                        </span>
                                                    </td>
                                                    <td className="font-bold text-gray-700">
                                                        ₹{session.cost_inr} <span className="text-xs text-gray-500">(${session.cost_usd})</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-6 text-gray-500">
                                                    No active charging sessions
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
