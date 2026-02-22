// src/api.js
// Central API base URL.
// Uses the same hostname the BROWSER used to open the app, but on port 5000.
// This way: localhost → localhost:5000, phone on LAN → 10.2.19.158:5000
const { protocol, hostname } = window.location;
export const API_BASE = `${protocol}//${hostname}:5000/api`;
export const SOCKET_URL = `${protocol}//${hostname}:5000`;
