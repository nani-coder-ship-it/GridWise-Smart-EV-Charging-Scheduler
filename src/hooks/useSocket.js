// src/hooks/useSocket.js
// Custom hook that connects to the Flask-SocketIO server and lets
// components subscribe to real-time events.
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import { SOCKET_URL } from '../api';

// Singleton socket — shared across all hook consumers so we don't open
// multiple connections from the same browser tab.
let _socket = null;

function getSocket() {
    if (!_socket || _socket.disconnected) {
        _socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });
    }
    return _socket;
}

/**
 * useSocket(event, handler)
 * Subscribe to a SocketIO event for the lifetime of the component.
 *
 * @param {string}   event    – SocketIO event name, e.g. 'schedule_update'
 * @param {Function} handler  – callback(data)
 */
export function useSocket(event, handler) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;   // always call the latest version

    useEffect(() => {
        const socket = getSocket();
        const cb = (data) => handlerRef.current(data);
        socket.on(event, cb);
        return () => socket.off(event, cb);
    }, [event]);
}

export default getSocket;
