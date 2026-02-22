import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { API_BASE } from '../api';

const GridContext = createContext();

export const useGrid = () => useContext(GridContext);

export const GridProvider = ({ children }) => {
    const [sessions, setSessions] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [stats, setStats] = useState({
        // Default init
        totalLoad: 0,
        activeEVs: 0,
        waitingEVs: 0,
        costSaved: 0,
        stressLevel: 'Stable',
        transformerUtilization: 0,
        peakPrediction: '--:--'
    });

    const [submissionResult, setSubmissionResult] = useState(null);

    const [logs, setLogs] = useState([]);

    // ── Browser Notifications ─────────────────────────────────────────────
    const [notifiedRequestIds, setNotifiedRequestIds] = useState(new Set());

    const requestNotificationPermission = () => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    };

    const sendBrowserNotification = (title, body) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
        }
    };

    // Track status transitions for notifications
    useEffect(() => {
        if (!sessions || sessions.length === 0) return;

        sessions.forEach(session => {
            const key = `${session.id}-${session.status}`;
            if (!notifiedRequestIds.has(key)) {
                // If it's a known request from this session's localStorage, notify
                const myRequests = JSON.parse(localStorage.getItem('my_gridwise_requests') || '[]');
                if (myRequests.includes(session.request_id)) {
                    if (session.status === 'Charging') {
                        sendBrowserNotification("GridWise ⚡", `Charging started for ${session.vehicle_id}!`);
                        setNotifiedRequestIds(prev => new Set(prev).add(key));
                    } else if (session.status === 'Completed') {
                        sendBrowserNotification("GridWise ⚡", `Charging complete for ${session.vehicle_id}!`);
                        setNotifiedRequestIds(prev => new Set(prev).add(key));
                    }
                }
            }
        });
    }, [sessions]);

    // ── WebSocket live refresh ───────────────────────────────────────────────
    // When the backend emits schedule_update (after schedule or cancel),
    // immediately pull fresh data so the admin dashboard is always current.
    useSocket('schedule_update', useCallback(() => {
        refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []));

    // API Service Layer (Internal)
    const fetchGridStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/grid/status`);
            const data = await response.json();

            setStats({
                totalLoad: data.total_load_kw,
                activeEVs: data.active_evs,
                waitingEVs: data.waiting_evs,
                costSaved: data.cost_saved_today,
                carbonSaved: data.carbon_saved_total,
                renewablePercent: data.renewable_percent,
                stressLevel: data.stress_level,
                transformerUtilization: data.transformer_utilization,
                peakPrediction: data.peak_prediction,
                recommendation: data.recommendation,
                acLoad: data.ac_load_kw,
                dcLoad: data.dc_load_kw
            });
        } catch (error) {
            console.error("Failed to fetch grid status:", error);
        }
    };

    const fetchActiveSchedule = async () => {
        try {
            const response = await fetch(`${API_BASE}/active-schedule`);
            const data = await response.json();
            setSessions(data);
        } catch (error) {
            console.error("Failed to fetch schedule:", error);
        }
    };

    const fetchLoadHistory = async () => {
        try {
            const response = await fetch(`${API_BASE}/grid/load-history`);
            const data = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    const fetchSystemLogs = async () => {
        try {
            const response = await fetch(`${API_BASE}/system/logs`);
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        }
    };

    const refreshData = async () => {
        await Promise.all([
            fetchGridStatus(),
            fetchActiveSchedule(),
            fetchLoadHistory(),
            fetchSystemLogs()
        ]);
    };

    // Poll every 5 seconds
    React.useEffect(() => {
        refreshData(); // Initial
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    const addRequest = async (request) => {
        try {
            const response = await fetch(`${API_BASE}/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vehicle_id: `EV-${Math.floor(Math.random() * 900) + 100}`,
                    current_battery: parseFloat(request.currentBattery),
                    target_battery: parseFloat(request.targetBattery),
                    departure_time: request.departureTime ? new Date(request.departureTime).toISOString() : new Date(new Date().setHours(new Date().getHours() + 12)).toISOString(),
                    priority: request.priority.toLowerCase(),
                    charger_type: request.chargerType || 'AC'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Server Error:", errorData);
                setSubmissionResult({ success: false, message: "Failed to schedule." });
                return;
            }

            const data = await response.json();

            if (data.status === 'success' || data.status === 'scheduled') {
                // Store request ID in localStorage so we can track status for notifications
                if (data.request_id) {
                    const myRequests = JSON.parse(localStorage.getItem('my_gridwise_requests') || '[]');
                    localStorage.setItem('my_gridwise_requests', JSON.stringify([...new Set([...myRequests, data.request_id])]));
                }

                // Refresh all data immediately
                await refreshData();
                setSubmissionResult({ success: true, schedule: data.schedule, insight: data.insight });
            } else {
                setSubmissionResult({ success: false, message: data.message || "Unknown error occurred." });
            }
        } catch (error) {
            console.error("Error scheduling request:", error);
            setSubmissionResult({ success: false, message: "Network error." });
        }
    };

    return (
        <GridContext.Provider value={{
            sessions,
            stats,
            historyData,
            logs,
            addRequest,
            submissionResult, setSubmissionResult,
            refreshData,
            requestNotificationPermission,
            sendBrowserNotification
        }}>
            {children}
        </GridContext.Provider>
    );
};
