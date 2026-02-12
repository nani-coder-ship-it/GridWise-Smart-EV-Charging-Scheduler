import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import Button from '../ui/Button';
import './Navbar.css';
import { clsx } from 'clsx';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsOpen(!isOpen);

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-logo">
                    <Zap className="logo-icon" />
                    <span>GridWise</span>
                </Link>

                {/* Desktop Menu */}
                <div className="navbar-links desktop-only">
                    <Link to="/" className={clsx('nav-link', isActive('/') && 'active')}>Home</Link>
                    <Link to="/resident" className={clsx('nav-link', isActive('/resident') && 'active')}>Resident Panel</Link>
                    <Link to="/admin" className={clsx('nav-link', isActive('/admin') && 'active')}>Admin Dashboard</Link>
                </div>

                <div className="navbar-actions desktop-only">
                    <Link to="/resident">
                        <Button variant="primary" size="sm">Request Charging</Button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="mobile-toggle" onClick={toggleMenu}>
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="mobile-menu">
                    <Link to="/" className="mobile-link" onClick={toggleMenu}>Home</Link>
                    <Link to="/resident" className="mobile-link" onClick={toggleMenu}>Resident Panel</Link>
                    <Link to="/admin" className="mobile-link" onClick={toggleMenu}>Admin Dashboard</Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
