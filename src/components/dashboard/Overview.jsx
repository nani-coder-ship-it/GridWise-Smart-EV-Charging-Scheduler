import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceArea, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Zap, TrendingUp, Leaf, Sun, Wind } from 'lucide-react';
import SystemIntelligence from './SystemIntelligence';

const Overview = ({ stats, historyData, sessions, formatCurrency, safeNum, safeFloat }) => {
    const usageData = [
        { name: 'AC Level 2', value: stats.acLoad || 40 },
        { name: 'DC Fast', value: stats.dcLoad || 20 },
        { name: 'Idle', value: 100 - (stats.transformerUtilization || 0) }
    ];
    const COLORS = ['#3b82f6', '#f59e0b', '#e5e7eb'];

    return (
        <div className="dashboard-scroll">
            {/* ── Main 3-column layout ── */}
            <div className="center-panel">
                {/* KPI GRID */}
                <div className="kpi-grid">
                    <div className="glass-card kpi-card">
                        <div className="kpi-header">
                            <span>Transformer Load</span>
                            <Activity size={18} className="text-blue-500" />
                        </div>
                        <div className="kpi-value">{safeNum(stats.transformerUtilization)}%</div>
                        <div>
                            <span className={`kpi-trend ${stats.stressLevel === 'Critical' ? 'trend-down' : 'trend-up'}`}>
                                {stats.stressLevel || 'Stable'}
                            </span>
                        </div>
                    </div>

                    <div className="glass-card kpi-card">
                        <div className="kpi-header">
                            <span>Cost Saved</span>
                            <Leaf size={18} className="text-green-500" />
                        </div>
                        <div className="kpi-value text-green-600">{formatCurrency(stats.costSaved)}</div>
                        <div className="text-xs text-gray-500">{safeFloat(stats.carbonSaved)} kg CO₂ avoided</div>
                    </div>

                    <div className="glass-card kpi-card">
                        <div className="kpi-header">
                            <span>Active Power</span>
                            <Zap size={18} className="text-amber-500" />
                        </div>
                        <div className="kpi-value">
                            {safeFloat(Number(stats.acLoad) + Number(stats.dcLoad))} <span className="text-lg text-gray-400">kW</span>
                        </div>
                        <div className="flex gap-2 text-xs font-medium">
                            <span className="text-blue-600">AC: {safeFloat(stats.acLoad)}</span>
                            <span className="text-amber-600">DC: {safeFloat(stats.dcLoad)}</span>
                        </div>
                    </div>

                    <div className="glass-card kpi-card">
                        <div className="kpi-header">
                            <span>Next Peak</span>
                            <TrendingUp size={18} className="text-purple-500" />
                        </div>
                        <div className="kpi-value">{stats.peakPrediction || '19:00'}</div>
                        <div><span className="kpi-trend trend-neutral">Forecast</span></div>
                    </div>
                </div>

                {/* LARGE CHART */}
                <div className="glass-card chart-container">
                    <div className="chart-header">
                        <h3>Real-Time Load Analytics</h3>
                        <div className="flex gap-4 text-sm font-medium">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Raw Load</span>
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> AI Optimized</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <ReferenceArea x1="18:00" x2="22:00" fill="#fee2e2" fillOpacity={0.2} />
                            <Area type="monotone" dataKey="raw_load" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
                            <Area type="monotone" dataKey="optimized_load" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOptimized)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* AI INSIGHTS */}
                <div className="ai-insights">
                    <div className="glass-card insight-block">
                        <div className="insight-icon"><Zap size={24} /></div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">AI Recommendation</h4>
                            <p className="text-sm text-gray-600 mb-0">
                                {stats.recommendation || "System optimal. No immediate actions required."}
                            </p>
                        </div>
                    </div>
                    <div className="glass-card insight-block" style={{ borderLeftColor: '#3b82f6', background: '#eff6ff' }}>
                        <div className="insight-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">Efficiency Boost</h4>
                            <p className="text-sm text-gray-600 mb-0">
                                Shift 15% of flexible loads to 02:00 AM to maximize battery lifespan.
                            </p>
                        </div>
                    </div>
                </div>

                {/* TABLE PREVIEW */}
                <div className="glass-card table-section">
                    <div className="flex justify-between items-center mb-4">
                        <h3>Active Charging Sessions</h3>
                    </div>
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
                                {sessions && sessions.length > 0 ? sessions.slice(0, 5).map((session, i) => (
                                    <tr key={i}>
                                        <td className="font-medium text-gray-900">{session.vehicle_id}</td>
                                        <td>
                                            <span className={`badge badge-${session.priority.toLowerCase()}`}>
                                                {session.priority}
                                            </span>
                                        </td>
                                        <td>{session.start_time} - {session.end_time}</td>
                                        <td>
                                            <div className="flex items-center">
                                                <span className="status-dot status-scheduled"></span>
                                                Scheduled
                                            </div>
                                        </td>
                                        <td className="font-semibold">₹{session.cost_inr}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-gray-500 py-6">No active sessions</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <aside className="right-panel">
                <div className="glass-card donut-widget text-center">
                    <h4 className="text-gray-600 font-semibold mb-2">Charger Utilization</h4>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={usageData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {usageData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span className="text-2xl font-bold text-gray-800">{safeNum(stats.transformerUtilization)}%</span>
                        <span className="block text-xs text-gray-500">Total Load</span>
                    </div>
                </div>

                <div className="glass-card">
                    <h4 className="text-gray-600 font-semibold mb-4">Energy Mix</h4>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
                            <Sun size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-0">Solar Contribution</p>
                            <p className="text-xl font-bold text-gray-800">{stats.renewablePercent || 45}%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <Wind size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-0">Grid Power</p>
                            <p className="text-xl font-bold text-gray-800">{100 - (stats.renewablePercent || 45)}%</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── System Intelligence Panel — full width ── */}
            <div style={{ padding: '0 1.5rem 2rem', gridColumn: '1 / -1' }}>
                <SystemIntelligence stats={stats} />
            </div>
        </div>
    );
};

export default Overview;
