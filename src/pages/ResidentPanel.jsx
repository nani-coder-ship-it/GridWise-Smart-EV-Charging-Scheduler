import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Card, { CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { BatteryCharging, CheckCircle2, Zap, ArrowRight, Leaf } from 'lucide-react';
import { useGrid } from '../context/GridContext';
import './ResidentPanel.css';

const ResidentPanel = () => {
    const { addRequest } = useGrid();
    const [formData, setFormData] = useState({
        currentBattery: '',
        targetBattery: '80',
        departureTime: '',
        priority: 'normal'
    });

    const [requestStatus, setRequestStatus] = useState(null); // null, 'loading', 'scheduled'
    const [schedule, setSchedule] = useState(null);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        setRequestStatus('loading');

        // Simulate AI Optimization Delay
        setTimeout(() => {
            // Mock Scheduling Logic
            const departure = new Date(formData.departureTime);
            const start = new Date(departure);
            start.setHours(start.getHours() - 3); // Mock 3 hour charge

            const newSchedule = {
                startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                endTime: departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: '3h 15m',
                cost: '$4.50',
                savings: '$1.20',
                load: 'Optimized',
                carbonReduced: '1.8 kg CO₂',
                isOffPeak: true,
                timeRange: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            };

            setSchedule(newSchedule);
            addRequest({ ...formData, schedule: newSchedule });
            setRequestStatus('scheduled');
        }, 1500);
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
                                                <span className="value">{schedule.startTime}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">End Time</span>
                                                <span className="value">{schedule.endTime}</span>
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
                                </Card>

                                <div className="pulse-indicator">
                                    <span className="pulse-dot"></span>
                                    Waiting for vehicle connection...
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-graphic">
                                    <Zap size={48} className="empty-icon" />
                                </div>
                                <h3>No Optimized Charging Allocation</h3>
                                <p>Submit a charging request to see your AI-optimized schedule and cost estimates.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResidentPanel;
