import React, { useState } from 'react';
import { Save, RefreshCw, Zap, Clock, Shield, Leaf, Activity } from 'lucide-react';

const Toggle = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        aria-checked={checked}
        role="switch"
        style={{
            width: 48,
            height: 26,
            borderRadius: 99,
            border: 'none',
            background: checked ? '#2563eb' : '#d1d5db',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s ease',
            flexShrink: 0,
            boxShadow: checked ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
            outline: 'none',
        }}
    >
        <span style={{
            position: 'absolute',
            top: 3,
            left: checked ? 24 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
    </button>
);

const SettingRow = ({ icon: Icon, iconBg, iconColor, title, description, children }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 0',
        borderBottom: '1px solid #f3f4f6',
        gap: 16,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: iconBg, color: iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={18} />
            </div>
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2 }}>{description}</div>
            </div>
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
);

const DEFAULT_SETTINGS = {
    transformerLimit: 80,
    peakHoursEnabled: true,
    dcFastChargeCap: false,
    carbonOptimization: true,
    communitySharing: false,
};

const Settings = () => {
    const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
    const [saved, setSaved] = useState(false);

    const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        // Here you could POST to the backend
    };

    const handleReset = () => setSettings({ ...DEFAULT_SETTINGS });

    return (
        <div style={{ width: '100%', padding: '0 0 32px 0' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 24px 0' }}>Settings</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 960 }}>

                {/* Grid Constraints Card */}
                <div style={{
                    background: 'white', borderRadius: 16, padding: '24px 28px',
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                        Grid Constraints
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 20px 0' }}>
                        Configure transformer load and capacity limits
                    </p>

                    {/* Transformer Limit Slider */}
                    <div style={{
                        background: '#f8f9fc', borderRadius: 12, padding: '16px 20px', marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Activity size={16} color="#2563eb" />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>
                                    Transformer Load Limit
                                </span>
                            </div>
                            <span style={{
                                background: '#dbeafe', color: '#1d4ed8',
                                borderRadius: 8, padding: '4px 12px',
                                fontWeight: 700, fontSize: '0.9rem'
                            }}>
                                {settings.transformerLimit}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={50}
                            max={100}
                            step={5}
                            value={settings.transformerLimit}
                            onChange={e => setSettings({ ...settings, transformerLimit: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
                            <span>50%</span><span>75%</span><span>100%</span>
                        </div>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>
                        System will trigger load-shedding if utilization exceeds this threshold.
                    </p>
                </div>

                {/* Charging Policy Card */}
                <div style={{
                    background: 'white', borderRadius: 16, padding: '24px 28px',
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                        Charging Policies
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 4px 0' }}>
                        Toggle operational behaviour modes
                    </p>

                    <SettingRow
                        icon={Clock} iconBg="#fef3c7" iconColor="#d97706"
                        title="Peak Hour Protections"
                        description="Reduce charging speeds during 6 PM – 10 PM"
                    >
                        <Toggle checked={settings.peakHoursEnabled} onChange={() => toggle('peakHoursEnabled')} />
                    </SettingRow>

                    <SettingRow
                        icon={Zap} iconBg="#fee2e2" iconColor="#dc2626"
                        title="Cap DC Fast Charging"
                        description="Limit DC chargers to 50 kW during high stress"
                    >
                        <Toggle checked={settings.dcFastChargeCap} onChange={() => toggle('dcFastChargeCap')} />
                    </SettingRow>

                    <SettingRow
                        icon={Leaf} iconBg="#dcfce7" iconColor="#16a34a"
                        title="Carbon-Aware Optimization"
                        description="Prioritize charging when carbon intensity is low"
                    >
                        <Toggle checked={settings.carbonOptimization} onChange={() => toggle('carbonOptimization')} />
                    </SettingRow>

                    <SettingRow
                        icon={Shield} iconBg="#ede9fe" iconColor="#7c3aed"
                        title="Community Sharing Mode"
                        description="Allow shared charging slot allocation between users"
                    >
                        <Toggle checked={settings.communitySharing} onChange={() => toggle('communitySharing')} />
                    </SettingRow>
                </div>
            </div>

            {/* Save / Reset Buttons */}
            <div style={{
                display: 'flex', gap: 12, marginTop: 28, maxWidth: 960,
                justifyContent: 'flex-end'
            }}>
                <button
                    onClick={handleReset}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px', borderRadius: 10,
                        border: '1px solid #e5e7eb', background: 'white',
                        color: '#374151', fontWeight: 600, fontSize: '0.9rem',
                        cursor: 'pointer', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                    <RefreshCw size={15} /> Reset to Defaults
                </button>
                <button
                    onClick={handleSave}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px', borderRadius: 10,
                        border: 'none',
                        background: saved ? '#16a34a' : '#2563eb',
                        color: 'white', fontWeight: 600, fontSize: '0.9rem',
                        cursor: 'pointer', transition: 'background 0.2s',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                    }}
                >
                    <Save size={15} /> {saved ? 'Saved ✓' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
