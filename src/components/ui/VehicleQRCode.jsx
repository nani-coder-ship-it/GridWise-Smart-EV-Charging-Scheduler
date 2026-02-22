// src/components/ui/VehicleQRCode.jsx
// Renders a QR code that encodes the direct Status Lookup URL.
// Scanning the QR → opens /status?v=<vehicle_id> which auto-loads the result.
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function VehicleQRCode({ vehicleId, size = 120 }) {
    // Use window.location.origin so the QR encodes whatever address the USER
    // opened the app with.  Open the app as http://10.2.19.158:5173 (your PC's
    // LAN IP) instead of localhost, and the QR becomes phone-scannable.
    const base = window.location.origin;
    const url = `${base}/status?v=${encodeURIComponent(vehicleId)}`;


    return (
        <div style={{ textAlign: 'center' }}>
            <div
                style={{
                    display: 'inline-block',
                    background: '#fff',
                    padding: 10,
                    borderRadius: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                }}
            >
                <QRCodeSVG
                    value={url}
                    size={size}
                    bgColor="#ffffff"
                    fgColor="#1B5E20"
                    level="M"
                    includeMargin={false}
                />
            </div>
            <p style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                marginTop: 6,
                marginBottom: 0,
            }}>
                📱 Scan to check status
            </p>
        </div>
    );
}
