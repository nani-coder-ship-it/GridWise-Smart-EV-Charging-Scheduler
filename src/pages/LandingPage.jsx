import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, TrendingDown, Users, BarChart3, ShieldCheck, Leaf, Globe, Sun, TrendingUp } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CountUp from '../components/ui/CountUp';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="container hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">
                            AI-Powered EV Charging <br />
                            <span className="text-gradient">Scheduler for Smart Grid</span>
                        </h1>
                        <p className="trust-line">Built for Smart Communities & EV Infrastructure Modernization</p>
                        <p className="hero-subtitle">
                            Optimizing energy distribution, reducing peak load stress, and enabling sustainable EV adoption for modern communities.
                        </p>
                        <div className="hero-actions">
                            <Link to="/resident">
                                <Button variant="primary" size="lg">
                                    Request Charging <Zap size={20} />
                                </Button>
                            </Link>
                            <Link to="/admin">
                                <Button variant="outline" size="lg">
                                    View Admin Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="hero-image">
                        {/* Abstract representation of smart grid/charging */}
                        <div className="hero-graphic">
                            <div className="pulse-container">
                                <div className="pulse-ring ring-1"></div>
                                <div className="pulse-ring ring-2"></div>
                                <div className="pulse-ring ring-3"></div>
                                <div className="icon-glow">
                                    <Zap className="hero-icon animated-icon" size={80} />
                                </div>
                            </div>
                            <div className="ai-badge floating-badge">
                                <span className="ai-dot"></span> AI Optimized
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="section how-it-works-section">
                <div className="container">
                    <h2 className="section-title text-center">How It Works</h2>
                    <div className="steps-grid">
                        <div className="step-item">
                            <div className="step-icon-wrapper">
                                <Users size={32} />
                                <span className="step-number">1</span>
                            </div>
                            <h3>Residents Submit Requests</h3>
                            <p>Users input charging needs and departure times via the app.</p>
                        </div>
                        <div className="step-arrow">
                            <ArrowRight size={24} />
                        </div>
                        <div className="step-item">
                            <div className="step-icon-wrapper">
                                <Zap size={32} />
                                <span className="step-number">2</span>
                            </div>
                            <h3>AI Optimizes Schedule</h3>
                            <p>Algorithms analyze grid load to find optimal low-cost slots.</p>
                        </div>
                        <div className="step-arrow">
                            <ArrowRight size={24} />
                        </div>
                        <div className="step-item">
                            <div className="step-icon-wrapper">
                                <BarChart3 size={32} />
                                <span className="step-number">3</span>
                            </div>
                            <h3>Smart Allocation</h3>
                            <p>Charging executes automatically, reducing peak grid stress.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact Stats */}
            <section className="stats-section">
                <div className="container stats-grid">
                    <div className="stat-card">
                        <div className="stat-value-wrapper">
                            <h3><CountUp to={30} suffix="%" /></h3>
                            <TrendingUp className="stat-trend-icon" />
                        </div>
                        <p>Peak Load Reduction</p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value-wrapper">
                            <h3><CountUp to={25} suffix="%" /></h3>
                            <TrendingUp className="stat-trend-icon" />
                        </div>
                        <p>Cost Savings</p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value-wrapper">
                            <h3><CountUp to={100} suffix="%" /></h3>
                            <TrendingUp className="stat-trend-icon" />
                        </div>
                        <p>Fair Allocation</p>
                    </div>
                </div>
            </section>

            {/* Comparison Section - The WINNER feature */}
            <section className="section comparison-section">
                <div className="container">
                    <h2 className="section-title text-center">The GridWise Difference</h2>
                    <p className="section-subtitle text-center mb-12">See the real-world impact of AI orchestration.</p>

                    <div className="comparison-wrapper">
                        {/* Without GridWise */}
                        <div className="comparison-card without">
                            <div className="comp-header">
                                <h3>Without GridWise</h3>
                                <span className="comp-badge bad">Unmanaged</span>
                            </div>
                            <div className="comp-metric">
                                <span className="metric-label">Peak Load</span>
                                <span className="metric-value red">120 kW</span>
                            </div>
                            <div className="comp-metric">
                                <span className="metric-label">Monthly Cost</span>
                                <span className="metric-value red">₹12,000</span>
                            </div>
                            <div className="comp-visual">
                                {/* Simple CSS bar chart representation */}
                                <div className="bar-chart-simple">
                                    <div className="bar red" style={{ height: '100%' }}></div>
                                    <div className="bar red" style={{ height: '90%' }}></div>
                                    <div className="bar red" style={{ height: '95%' }}></div>
                                </div>
                                <p className="visual-caption">High Peaks & Stress</p>
                            </div>
                        </div>

                        {/* VS Badge */}
                        <div className="vs-badge">VS</div>

                        {/* With GridWise */}
                        <div className="comparison-card with">
                            <div className="comp-header">
                                <h3>With GridWise</h3>
                                <span className="comp-badge good">AI Optimized</span>
                            </div>
                            <div className="comp-metric">
                                <span className="metric-label">Peak Load</span>
                                <span className="metric-value green">82 kW</span>
                            </div>
                            <div className="comp-metric">
                                <span className="metric-label">Monthly Cost</span>
                                <span className="metric-value green">₹8,900</span>
                            </div>
                            <div className="comp-visual">
                                <div className="bar-chart-simple">
                                    <div className="bar green" style={{ height: '60%' }}></div>
                                    <div className="bar green" style={{ height: '65%' }}></div>
                                    <div className="bar green" style={{ height: '55%' }}></div>
                                </div>
                                <p className="visual-caption">Balanced & Efficient</p>
                            </div>
                            <div className="reduction-highlight">
                                28% Cost Reduction
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="section problem-section">
                <div className="container">
                    <h2 className="section-title text-center">The Challenge</h2>
                    <p className="section-subtitle text-center">Unmanaged EV charging creates critical grid issues.</p>

                    <div className="grid-3">
                        <Card className="feature-card">
                            <div className="icon-box danger"><TrendingDown size={32} /></div>
                            <h3>Transformer Overload</h3>
                            <p>Simultaneous charging during peak hours strains the grid infrastructure.</p>
                        </Card>
                        <Card className="feature-card">
                            <div className="icon-box warning"><BarChart3 size={32} /></div>
                            <h3>High Costs</h3>
                            <p>Charging during peak tariff windows results in unnecessary high electricity bills.</p>
                        </Card>
                        <Card className="feature-card">
                            <div className="icon-box info"><Users size={32} /></div>
                            <h3>Charging Conflicts</h3>
                            <p>Lack of fair scheduling leads to disputes and inefficient resource usage.</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className="section solution-section">
                <div className="container">
                    <h2 className="section-title text-center">The GridWise Solution</h2>
                    <div className="solution-grid">
                        <div className="solution-content">
                            <ul className="solution-list">
                                <li>
                                    <ShieldCheck className="list-icon" />
                                    <div>
                                        <h4>AI-Driven Scheduling</h4>
                                        <p>Predictive algorithms optimize charging slots based on grid capacity.</p>
                                    </div>
                                </li>
                                <li>
                                    <Sun className="list-icon" />
                                    <div>
                                        <h4>Time-of-Use Optimization</h4>
                                        <p>Automatically shifts lower priority charging to off-peak hours.</p>
                                    </div>
                                </li>
                                <li>
                                    <Users className="list-icon" />
                                    <div>
                                        <h4>Fair Priority Allocation</h4>
                                        <p>Ensures emergency needs are met while maintaining equity.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        {/* Could add a visual graphic here later */}
                    </div>
                </div>
            </section>

            {/* SDG Section */}
            <section className="section sdg-section">
                <div className="container text-center">
                    <h2 className="section-title">Sustainable Development Goals</h2>
                    <div className="sdg-grid">
                        <div className="sdg-item">
                            <Leaf size={48} className="sdg-icon" />
                            <h4>Affordable & Clean Energy</h4>
                        </div>
                        <div className="sdg-item">
                            <Globe size={48} className="sdg-icon" />
                            <h4>Sustainable Cities</h4>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
