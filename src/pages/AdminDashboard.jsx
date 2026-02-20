import React, { useState, useEffect } from 'react';
import {
    Activity, Zap, Leaf, Settings as SettingsIcon, BarChart2,
    Battery, Grid, FileText
} from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './AdminDashboard.css';

// Dashboard sub-views
import Overview from '../components/dashboard/Overview';
import Analytics from '../components/dashboard/Analytics';
import Sessions from '../components/dashboard/Sessions';
import Energy from '../components/dashboard/Energy';
import Reports from '../components/dashboard/Reports';
import SettingsView from '../components/dashboard/Settings';

const NAV_ITEMS = [
    { id: 'overview', label: 'Dashboard', icon: Grid },
    { id: 'analytics', label: 'Grid Analytics', icon: Activity },
    { id: 'sessions', label: 'Charging Sessions', icon: Battery },
    { id: 'energy', label: 'Energy Insights', icon: Leaf },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const AdminDashboard = () => {
    const { sessions, stats, historyData, refreshData } = useGrid();
    const [activeView, setActiveView] = useState('overview');

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 10000);
        return () => clearInterval(interval);
    }, []);

    // Safe data helpers
    const safeStats = stats || {
        transformerUtilization: 0, stressLevel: 'Stable',
        costSaved: 0, carbonSaved: 0, acLoad: 0, dcLoad: 0,
        peakPrediction: '--:--', recommendation: 'Loading...'
    };
    const safeNum = (val) => val !== undefined && val !== null ? Number(val).toFixed(0) : '0';
    const safeFloat = (val) => val !== undefined && val !== null ? Number(val).toFixed(1) : '0.0';
    const formatCurrency = (val) => val ? `₹${Number(val).toFixed(2)}` : '₹0.00';

    const renderView = () => {
        const sharedProps = { stats: safeStats, historyData: historyData || [], sessions: sessions || [], safeNum, safeFloat, formatCurrency };
        switch (activeView) {
            case 'overview': return <Overview {...sharedProps} />;
            case 'analytics': return <Analytics historyData={historyData || []} />;
            case 'sessions': return <Sessions sessions={sessions || []} />;
            case 'energy': return <Energy stats={safeStats} />;
            case 'reports': return <Reports />;
            case 'settings': return <SettingsView />;
            default: return <Overview {...sharedProps} />;
        }
    };

    const currentNav = NAV_ITEMS.find(n => n.id === activeView);

    return (
        <div className="admin-layout">
            {/* LEFT SIDEBAR */}
            <aside className="sidebar">
                <div className="logo-container">
                    <div style={{ width: 36, height: 36, background: '#3b82f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={20} color="white" fill="white" />
                    </div>
                    <span>GridWise AI</span>
                </div>

                <nav className="nav-menu">
                    {NAV_ITEMS.filter(n => n.id !== 'settings').map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`nav-item ${activeView === id ? 'active' : ''}`}
                            onClick={() => setActiveView(id)}
                        >
                            <Icon size={20} />
                            {label}
                        </button>
                    ))}
                </nav>

                <button
                    className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                    style={{ marginTop: 'auto' }}
                    onClick={() => setActiveView('settings')}
                >
                    <SettingsIcon size={20} />
                    Settings
                </button>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* CLEAN HEADER */}
                <header className="top-header">
                    <div className="header-left">
                        <h2>{currentNav?.label}</h2>
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                            GridWise AI Smart EV Charging Orchestrator
                        </p>
                    </div>
                    <div className="header-right" style={{ gap: 14 }}>
                        {/* System Status Indicator */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            borderRadius: 99, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, color: '#15803d'
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }}></span>
                            System Online
                        </div>
                        {/* Transformer Load Quick Indicator */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'white', border: '1px solid #e5e7eb',
                            borderRadius: 99, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, color: '#374151',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}>
                            <Activity size={15} color="#3b82f6" />
                            Load: {safeNum(safeStats.transformerUtilization)}%
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT with fade-in transition */}
                <div className="page-content" key={activeView} style={{
                    flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem',
                    animation: 'fadeIn 0.25s ease'
                }}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
