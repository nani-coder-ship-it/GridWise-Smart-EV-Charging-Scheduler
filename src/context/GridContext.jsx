import React, { createContext, useContext, useState } from 'react';

const GridContext = createContext();

export const useGrid = () => useContext(GridContext);

export const GridProvider = ({ children }) => {
    // Initial Mock Data for Admin Dashboard
    const [sessions, setSessions] = useState([
        { id: 'EV-204', priority: 'Emergency', time: '14:00 - 15:30', status: 'Charging', cost: '$5.20' },
        { id: 'EV-108', priority: 'Normal', time: '14:15 - 17:00', status: 'Waiting', cost: '$3.50' },
        { id: 'EV-305', priority: 'Flexible', time: '22:00 - 02:00', status: 'Scheduled', cost: '$1.80' },
        { id: 'EV-221', priority: 'Normal', time: '15:00 - 16:30', status: 'Waiting', cost: '$4.10' },
        { id: 'EV-099', priority: 'High', time: '13:45 - 14:45', status: 'Charging', cost: '$6.00' },
    ]);

    const [stats, setStats] = useState({
        totalLoad: 85,
        activeEVs: 24,
        costSaved: 145.20
    });

    const addRequest = (request) => {
        // Basic ID generation
        const newSession = {
            id: `EV-${Math.floor(Math.random() * 900) + 100}`,
            priority: request.priority.charAt(0).toUpperCase() + request.priority.slice(1),
            time: request.schedule.timeRange,
            status: 'Scheduled',
            cost: request.schedule.cost
        };

        setSessions(prev => [newSession, ...prev]);

        // Simulate updating stats
        setStats(prev => ({
            ...prev,
            activeEVs: prev.activeEVs + 1,
            totalLoad: Math.min(prev.totalLoad + 2, 100)
        }));
    };

    return (
        <GridContext.Provider value={{ sessions, stats, addRequest }}>
            {children}
        </GridContext.Provider>
    );
};
