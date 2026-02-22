import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import ResidentPanel from './pages/ResidentPanel';
import AdminDashboard from './pages/AdminDashboard';
import StatusPage from './pages/StatusPage';
import { GridProvider } from './context/GridContext';
import './index.css';

function App() {
    return (
        <GridProvider>
            <Router>
                <div className="app-container">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/resident" element={<ResidentPanel />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/status" element={<StatusPage />} />
                    </Routes>
                    <Footer />
                </div>
            </Router>
        </GridProvider>
    );
}

export default App;
