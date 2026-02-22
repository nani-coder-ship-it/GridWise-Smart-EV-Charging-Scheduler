// src/api.js
// Central API base URL.
// In production (Vercel deploy) VITE_API_URL is set to the Render backend URL.
// In local dev it falls back to dynamic hostname:5000 so LAN/QR scanning works.
const { protocol, hostname } = window.location;
export const API_BASE =
    import.meta.env.VITE_API_URL ?? `${protocol}//${hostname}:5000/api`;
export const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ?? `${protocol}//${hostname}:5000`;
