import React from 'react';
import { Heart } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-content">
                <div className="footer-left">
                    <h3 className="footer-title">GridWise Orchestrator</h3>
                    <p className="footer-subtitle">Built for Renault Nissan Technology Hackathon</p>
                </div>

                <div className="footer-right">
                    <div className="sdg-badges">
                        <span className="sdg-pill">SDG 7: Clean Energy</span>
                        <span className="sdg-pill">SDG 11: Sustainable Cities</span>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} GridWise Team. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
