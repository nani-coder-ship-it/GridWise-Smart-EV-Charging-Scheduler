import React from 'react';
import { Leaf, Sun, Wind, DollarSign } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const Energy = ({ stats }) => {
    const energyData = [
        { name: 'Solar', value: 45, fill: '#f59e0b' },
        { name: 'Wind', value: 20, fill: '#3b82f6' },
        { name: 'Grid', value: 35, fill: '#64748b' },
    ];

    return (
        <div className="dashboard-scroll">
            <div className="center-panel" style={{ gridColumn: '1 / -1' }}>
                <h2 className="text-2xl font-bold mb-6">Energy Insights & Sustainability</h2>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                            <Leaf size={24} />
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">Carbon Avoided Today</h3>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.carbonSaved || 0} kg</p>
                    </div>

                    <div className="glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4">
                            <Sun size={24} />
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">Renewable Utilization</h3>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.renewablePercent || 45}%</p>
                    </div>

                    <div className="glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                            <DollarSign size={24} />
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">Cost Savings</h3>
                        <p className="text-3xl font-bold text-gray-800 mt-2">₹{stats.costSaved || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Energy Mix Chart */}
                    <div className="glass-card">
                        <h3 className="font-semibold text-gray-700 mb-6">Energy Source Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={energyData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                        border: '1px solid #bbf7d0',
                        borderRadius: 16,
                        padding: 28,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36,
                                background: '#16a34a',
                                borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Leaf size={18} color="white" />
                            </div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#14532d' }}>
                                AI Sustainability Insight
                            </h3>
                        </div>

                        {/* Quote */}
                        <div style={{
                            background: 'white',
                            borderRadius: 12,
                            padding: '16px 20px',
                            borderLeft: '4px solid #22c55e',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: '0.95rem',
                                color: '#166534',
                                lineHeight: 1.7,
                                fontStyle: 'italic'
                            }}>
                                "Shifting 20% of the load to solar peak hours (11 AM – 2 PM) saved{' '}
                                <strong style={{ color: '#15803d', fontStyle: 'normal' }}>18% energy costs</strong>{' '}
                                today compared to unoptimized charging."
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[
                                { value: '12', label: 'Trees Equivalent', icon: '🌳' },
                                { value: '18%', label: 'Energy Saved', icon: '⚡' },
                                { value: `${stats.carbonSaved || 0} kg`, label: 'CO₂ Avoided', icon: '🌍' },
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    background: 'white',
                                    borderRadius: 12,
                                    padding: '12px 10px',
                                    textAlign: 'center',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                    border: '1px solid #dcfce7'
                                }}>
                                    <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{stat.icon}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d' }}>
                                        {stat.value}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500, marginTop: 2 }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Energy;
