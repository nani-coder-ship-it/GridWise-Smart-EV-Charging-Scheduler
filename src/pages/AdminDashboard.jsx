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

                    {/* Grid Protection Control Panel */}
                    <div className="grid-protection-panel mb-8">
                        <Card className="h-full border-t-4 border-t-blue-500 shadow-md">
                            <CardTitle className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <Shield size={20} className="text-blue-600" />
                                    <span className="text-lg font-bold text-gray-800">Grid Protection Control Panel</span>
                                </div>
                                <span className="text-xs font-mono text-gray-400">AID-PROTECT-v2.1</span>
                            </CardTitle>
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: Status & Insights */}
                                <div className="space-y-6">
                                    {/* Status Indicators */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grid Condition</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${stats.stressLevel === 'Critical' ? 'bg-red-500 animate-pulse' : stats.stressLevel === 'Warning' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                                                <span className={`text-lg font-bold ${stats.stressLevel === 'Critical' ? 'text-red-600' : stats.stressLevel === 'Warning' ? 'text-orange-600' : 'text-emerald-700'}`}>
                                                    {stats.stressLevel || 'Stable'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Restrictions</span>
                                            <div className="flex items-center gap-2">
                                                {stats.stressLevel === 'Critical' ? <Lock size={16} className="text-red-500" /> : <Unlock size={16} className="text-emerald-500" />}
                                                <span className="font-semibold text-gray-700">
                                                    {stats.stressLevel === 'Critical' ? 'Active' : stats.stressLevel === 'Warning' ? 'Flexible Only' : 'None'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Actions Summary */}
                                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                        <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                            <Activity size={14} /> AI Actions Performed
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Overload Prevention</span>
                                                <span className={`font-mono font-bold ${stats.stressLevel === 'Critical' ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {stats.stressLevel === 'Critical' ? 'ACTIVE' : 'STANDBY'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Flexible Load Shifting</span>
                                                <span className={`font-bold ${stats.stressLevel === 'Warning' || stats.stressLevel === 'Critical' ? 'text-orange-600' : 'text-gray-400'}`}>
                                                    {stats.stressLevel === 'Warning' || stats.stressLevel === 'Critical' ? 'IN PROGRESS' : 'IDLE'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">DC Fast Charge</span>
                                                <span className={`font-bold ${stats.stressLevel === 'Critical' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {stats.stressLevel === 'Critical' ? 'RESTRICTED' : 'AVAILABLE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Insight Message */}
                                    <div className="ai-insight-box mt-4">
                                        <div className="insight-header flex items-center gap-2 mb-2">
                                            <Zap size={14} className="text-amber-500" />
                                            <span className="insight-label">AI DECISION</span>
                                        </div>
                                        <p className="insight-text text-sm text-gray-700 italic">
                                            {stats.stressLevel === 'Critical'
                                                ? "Critical load detected. AI has restricted high-power charging to prevent transformer overload."
                                                : stats.stressLevel === 'Warning'
                                                    ? "Grid approaching capacity. AI is shifting flexible loads to next available solar window."
                                                    : "Grid is stable. AI is optimizing for cost and carbon efficiency."
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column: Timeline */}
                                <div className="border-l border-gray-100 pl-6 relative">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Clock size={14} /> Event Timeline
                                    </h3>

                                    <div className="logs-timeline space-y-6">
                                        {logs && logs.length > 0 ? (
                                            (showAllLogs ? logs : logs.slice(0, 3)).map((log, index) => {
                                                // Determine Color
                                                let colorClass = "bg-gray-200";
                                                let textColor = "text-gray-600";
                                                if (log.level === 'CRITICAL' || log.level === 'ERROR') { colorClass = "bg-red-500"; textColor = "text-red-700"; }
                                                if (log.level === 'WARNING') { colorClass = "bg-orange-500"; textColor = "text-orange-700"; }
                                                if (log.level === 'RESOLVED') { colorClass = "bg-emerald-500"; textColor = "text-emerald-700"; }

                                                return (
                                                    <div key={log.id} className="relative pl-2">
                                                        {/* Timeline Line/Dot */}
                                                        <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${colorClass} z-10`}></div>
                                                        {index !== logs.length - 1 && (
                                                            <div className="absolute -left-[26px] top-4 w-0.5 h-full bg-gray-100 -z-0"></div>
                                                        )}

                                                        <div className="timeline-content">
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-bold ${textColor} mb-0.5`}>
                                                                    {log.level === 'ERROR' ? 'CRITICAL ALERT' : log.level}
                                                                </span>
                                                                <span className="text-xs text-gray-400 font-mono mb-1">{log.timestamp}</span>
                                                                <p className="text-sm text-gray-800 font-medium leading-relaxed bg-white/50">
                                                                    {log.message}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="text-center py-8 text-gray-400 italic">
                                                No recent grid events.
                                            </div>
                                        )}
                                    </div>

                                    {logs && logs.length > 3 && (
                                        <button
                                            onClick={() => setShowAllLogs(!showAllLogs)}
                                            className="mt-6 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                        >
                                            {showAllLogs ? "View Less" : "View Full History"}
                                        </button>
                                    )}
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
