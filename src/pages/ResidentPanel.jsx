import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Card, { CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { BatteryCharging, CheckCircle2, Zap, ArrowRight, Leaf, AlertTriangle } from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './ResidentPanel.css';

const ResidentPanel = () => {
    const { addRequest, submissionResult } = useGrid();
    const [formData, setFormData] = useState({
        currentBattery: '',
        targetBattery: '80',
        departureTime: '',
        chargerType: 'AC',
        priority: 'normal'
    });

    const [requestStatus, setRequestStatus] = useState(null); // null, 'loading', 'scheduled'
    const [schedule, setSchedule] = useState(null);

    // Persist success message from Context
    React.useEffect(() => {
        if (submissionResult) {
            if (submissionResult.success) {
                setSchedule(submissionResult.schedule);
                setRequestStatus('scheduled');
            } else if (submissionResult.success === false) {
                setRequestStatus('error');
            }
        }
    }, [submissionResult]);

    // Helper to format ISO time to Local 12h format
    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Progress Simulation Logic
    const [progress, setProgress] = useState(0);
    const [statusLabel, setStatusLabel] = useState('Scheduled');

    React.useEffect(() => {
        if (!schedule) return;

        const updateProgress = () => {
            const now = new Date();
            // Schedule times are now ISO strings from backend
            const startTime = new Date(schedule.startTime);
            const endTime = new Date(schedule.endTime);

            if (now < startTime) {
                setProgress(0);
                setStatusLabel(`Scheduled for ${formatTime(schedule.startTime)}`);
            } else if (now >= startTime && now <= endTime) {
                const total = endTime - startTime;
                const elapsed = now - startTime;
                const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                setProgress(pct);
                setStatusLabel(`⚡ Charging... ${Math.round(pct)}%`);
            } else {
                setProgress(100);
                setStatusLabel('Completed');
            }
        };

        updateProgress(); // Initial
        const timer = setInterval(updateProgress, 10000); // Update every 10s
        return () => clearInterval(timer);
    }, [schedule]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Enforce 0-100 range for battery inputs
        if (name === 'currentBattery' || name === 'targetBattery') {
            const numValue = parseInt(value, 10);
            if (numValue > 100) newValue = '100';
            else if (numValue < 0) newValue = '0';
        }

        setFormData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setRequestStatus('loading');

        // addRequest now updates global state, which triggers the useEffect above
        await addRequest(formData);
    };

    return (
        <div className="resident-page">
            <div className="container">
                <header className="page-header">
                    <h1 className="page-title">Resident Charging Portal</h1>
                    <p className="page-subtitle">Manage your EV charging with smart, predictive scheduling.</p>
                </header>

                <div className="resident-grid">
                    {/* Request Form */}
                    <div className="form-section">
                        <Card className="request-card">
                            <CardContent>
                                <div className="card-header-internal">
                                    <div className="icon-wrapper">
                                        <BatteryCharging className="icon-main" />
                                    </div>
                                    <div>
                                        <CardTitle>New Charging Request</CardTitle>
                                        <p className="card-desc">Enter your requirements for the AI scheduler.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
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

                                    <div className="input-wrapper mb-4">
                                        <label className="input-label">Charger Type</label>
                                        <select
                                            className="input-field"
                                            name="chargerType"
                                            value={formData.chargerType}
                                            onChange={handleInputChange}
                                        >
                                            <option value="AC">AC Standard (7kW)</option>
                                            <option value="DC">DC Fast Charge (50kW)</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">DC Fast Charge is high power and may be limited during peak grid stress.</p>
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
                                        <select
                                            className="input-field"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                        >
                                            <option value="flexible">Flexible (Lowest Cost)</option>
                                            <option value="normal">Normal</option>
                                            <option value="emergency">Emergency (Immediate)</option>
                                        </select>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full mt-4"
                                        disabled={requestStatus === 'loading'}
                                    >
                                        {requestStatus === 'loading' ? 'Optimizing Schedule...' : 'Run AI Optimization'}
                                        {!requestStatus && <ArrowRight size={18} />}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status / Output */}
                    <div className="status-section">
                        {requestStatus === 'scheduled' ? (
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
                                            <div className="detail-item">
                                                <span className="label">Start Time</span>
                                                <span className="value">{formatTime(schedule.startTime)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">End Time</span>
                                                <span className="value">{formatTime(schedule.endTime)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Duration</span>
                                                <span className="value">{schedule.duration}</span>
                                            </div>
                                        </div>

                                        <div className="cost-box">
                                            <div className="cost-row">
                                                <span>Estimated Cost</span>
                                                <span className="cost-value">{schedule.cost}</span>
                                            </div>
                                            <div className="cost-row savings">
                                                <span>Peak Avoidance Savings</span>
                                                <span className="save-value">-{schedule.savings}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    {/* Smart Notification / Insight */}
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

                                    {/* Charging Progress UI */}
                                    <div className="charging-progress-container mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-gray-700">Charging Progress</span>
                                            <span className={`font-bold ${progress === 100 ? 'text-green-600' : progress > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>Current: {formData.currentBattery}%</span>
                                            <span>Target: {formData.targetBattery}%</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-graphic">
                                    <Zap size={48} className="empty-icon" />
                                </div>
                                <h3 className="text-gray-700 font-bold mb-2">No Active Session</h3>
                                <p className="text-gray-500 text-sm">Submit a request to let AI optimize your charging schedule.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResidentPanel;
