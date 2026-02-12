import React from 'react';
import Card, { CardTitle, CardContent } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceArea } from 'recharts';
import { Activity, Zap, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './AdminDashboard.css';

const data = [
    { time: '00:00', load: 30, optimized: 30, capacity: 100 },
    { time: '04:00', load: 20, optimized: 25, capacity: 100 },
    { time: '08:00', load: 60, optimized: 55, capacity: 100 },
    { time: '12:00', load: 85, optimized: 75, capacity: 100 },
    { time: '16:00', load: 95, optimized: 80, capacity: 100 },
    { time: '20:00', load: 90, optimized: 70, capacity: 100 },
    { time: '23:59', load: 45, optimized: 40, capacity: 100 },
];

const AdminDashboard = () => {
    const { sessions, stats } = useGrid();

    return (
        <div className="admin-page">
            <div className="container">
                <header className="dashboard-header">
                    <div>
                        <h1 className="page-title">Smart Grid Dashboard</h1>
                        <p className="page-subtitle">Real-time monitoring and AI load orchestration.</p>
                    </div>
                    <div className="header-status">
                        <span className="status-badge live">
                            <span className="live-dot"></span> System Online
                        </span>
                    </div>
                </header>

                {/* Top Stats */}
                <div className="stats-grid-admin">
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper blue">
                            <Zap size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Total Load</span>
                            <span className="stat-value">{stats.totalLoad}%</span>
                            <span className="stat-trend negative">High Load</span>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper green">
                            <Activity size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Cost Saved Today</span>
                            <span className="stat-value">${stats.costSaved.toFixed(2)}</span>
                            <span className="stat-trend positive">+12% vs avg</span>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper orange">
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Active EVs</span>
                            <span className="stat-value">{stats.activeEVs}</span>
                            <span className="stat-trend neutral">8 Waiting</span>
                        </div>
                    </Card>
                    <Card className="stat-card-admin">
                        <div className="stat-icon-wrapper purple">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Peak Prediction</span>
                            <span className="stat-value">18:30</span>
                            <span className="stat-trend">Tomorrow</span>
                        </div>
                    </Card>
                </div>

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
                                    <AreaChart data={data}>
                                        <defs>
                                            <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const raw = payload.find(p => p.dataKey === 'load')?.value;
                                                    const opt = payload.find(p => p.dataKey === 'optimized')?.value;
                                                    const diff = raw - opt;
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                                                            <p className="font-bold text-gray-800 mb-2">{label}</p>
                                                            <div className="space-y-1 text-sm">
                                                                <p className="text-red-500">Raw Load: {raw}%</p>
                                                                <p className="text-green-500">Optimized: {opt}%</p>
                                                                {diff > 0 && (
                                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                                        <p className="text-green-600 font-bold text-xs">
                                                                            Savings: {diff}% Load Reduced
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        {/* Peak Hour Shading (18:00 - 22:00 mostly covers 16:00-23:59 range in our data points roughly, 
                                            but since our data is categorical (strings), ReferenceArea needs index or exact matches. 
                                            We'll use index or just highlight the visual region if possible, or use exact XAxis keys. */}
                                        <ReferenceArea x1="16:00" x2="23:59" strokeOpacity={0} fill="red" fillOpacity={0.05} label="Peak Pricing Zone" />

                                        <Area
                                            type="monotone"
                                            dataKey="load"
                                            stroke="#ef4444"
                                            fillOpacity={1}
                                            fill="url(#colorLoad)"
                                            strokeWidth={2}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="optimized"
                                            stroke="#22c55e"
                                            fillOpacity={1}
                                            fill="url(#colorOpt)"
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
                                    <span className="font-medium">Grid Capacity Usage</span>
                                    <span>Used: <span className="font-bold">{stats.totalLoad}%</span> | Available: <span className="text-green-600 font-bold">{100 - stats.totalLoad}%</span></span>
                                </div>
                                <div className="capacity-bar-bg">
                                    <div
                                        className={`capacity-bar-fill ${stats.totalLoad > 80 ? 'critical' : 'normal'}`}
                                        style={{ width: `${stats.totalLoad}%` }}
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
                                    “Shifting 3 flexible vehicles to 22:00 reduces peak by 12%.”
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
                                        {sessions.map((session) => (
                                            <tr key={session.id}>
                                                <td className="font-medium">{session.id}</td>
                                                <td>
                                                    <span className={`badge badge-${session.priority.toLowerCase()}`}>
                                                        {session.priority}
                                                    </span>
                                                </td>
                                                <td>{session.time}</td>
                                                <td>
                                                    <span className={`status-text status-${session.status.toLowerCase()}`}>
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td>{session.cost}</td>
                                            </tr>
                                        ))}
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
