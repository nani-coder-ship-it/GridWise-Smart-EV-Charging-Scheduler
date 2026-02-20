import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';

// --- Mock data generators ---
const generateDailyEnergySummaryCSV = () => {
    const rows = [
        ['Time', 'Raw Load (kW)', 'Optimized Load (kW)', 'Sessions', 'Cost (INR)'],
        ['06:00', 45, 38, 2, 120],
        ['08:00', 62, 51, 4, 210],
        ['10:00', 55, 47, 3, 185],
        ['12:00', 70, 58, 5, 240],
        ['14:00', 68, 56, 5, 230],
        ['16:00', 80, 64, 6, 310],
        ['18:00', 95, 72, 8, 390],
        ['20:00', 90, 70, 7, 360],
        ['22:00', 65, 52, 4, 220],
        ['00:00', 30, 28, 1, 90],
    ];
    return rows.map(r => r.join(',')).join('\n');
};

const generatePeakLoadCSV = () => {
    const rows = [
        ['Peak Window', 'Max Load (kW)', 'Duration (min)', 'Sessions Affected', 'Action Taken'],
        ['18:00-19:00', 95, 60, 8, 'Load Shedding'],
        ['19:00-20:00', 90, 60, 7, 'DC Cap Applied'],
        ['20:00-21:00', 85, 60, 6, 'Priority Scheduling'],
    ];
    return rows.map(r => r.join(',')).join('\n');
};

const generateMonthlySavingsCSV = () => {
    const rows = [
        ['Week', 'Sessions', 'Energy (kWh)', 'Cost Without AI (INR)', 'Cost With AI (INR)', 'Savings (INR)'],
        ['Week 1', 42, 840, 12600, 9800, 2800],
        ['Week 2', 38, 760, 11400, 8900, 2500],
        ['Week 3', 51, 1020, 15300, 11900, 3400],
        ['Week 4', 47, 940, 14100, 11000, 3100],
    ];
    return rows.map(r => r.join(',')).join('\n');
};

const generateChargerAuditCSV = () => {
    const rows = [
        ['Charger ID', 'Type', 'Sessions Q1', 'Total Energy (kWh)', 'Uptime (%)', 'Avg Cost (INR)'],
        ['CHG-001', 'AC Level 2', 120, 2400, 98.2, 185],
        ['CHG-002', 'AC Level 2', 115, 2300, 96.8, 180],
        ['CHG-003', 'DC Fast', 80, 3200, 99.1, 340],
        ['CHG-004', 'DC Fast', 72, 2880, 97.5, 320],
        ['CHG-005', 'AC Level 2', 98, 1960, 95.0, 172],
    ];
    return rows.map(r => r.join(',')).join('\n');
};

// --- Trigger file download ---
const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Reports config ---
const REPORTS = [
    {
        title: 'Daily Energy Summary',
        date: 'Feb 20, 2026',
        type: 'CSV',
        generate: () => downloadFile(generateDailyEnergySummaryCSV(), 'daily_energy_summary.csv', 'text/csv'),
    },
    {
        title: 'Peak Load Analysis',
        date: 'Feb 19, 2026',
        type: 'CSV',
        generate: () => downloadFile(generatePeakLoadCSV(), 'peak_load_analysis.csv', 'text/csv'),
    },
    {
        title: 'Monthly Cost Savings',
        date: 'Jan 2026',
        type: 'CSV',
        generate: () => downloadFile(generateMonthlySavingsCSV(), 'monthly_savings_jan2026.csv', 'text/csv'),
    },
    {
        title: 'Charger Utilization Audit',
        date: 'Q1 2026',
        type: 'CSV',
        generate: () => downloadFile(generateChargerAuditCSV(), 'charger_utilization_q1_2026.csv', 'text/csv'),
    },
];

const Reports = () => {
    return (
        <div className="dashboard-scroll">
            <div className="center-panel" style={{ gridColumn: '1 / -1' }}>
                <h2 className="text-2xl font-bold mb-6">System Reports</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {REPORTS.map((report, i) => (
                        <div
                            key={i}
                            className="glass-card p-6 flex flex-col justify-between"
                            style={{ minHeight: 160 }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <FileText size={20} />
                                </div>
                                <span className="text-xs font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded">
                                    {report.type}
                                </span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 className="font-bold text-gray-800">{report.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <Calendar size={12} /> {report.date}
                                </div>
                            </div>
                            <button
                                onClick={report.generate}
                                style={{
                                    marginTop: 16,
                                    width: '100%',
                                    padding: '10px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#2563eb';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = '#eff6ff';
                                    e.currentTarget.style.color = '#2563eb';
                                }}
                            >
                                <Download size={14} /> Download {report.type}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reports;
