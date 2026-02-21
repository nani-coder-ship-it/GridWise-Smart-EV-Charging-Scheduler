import React from 'react';
import { Sun, DollarSign, Shield, Zap, CheckCircle, X } from 'lucide-react';

/* ── Tag styling ────────────────────────────────────────── */
const TAG_CONFIG = {
    "Solar Optimized": {
        icon: Sun, color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
        badge: '#dcfce7', badgeText: '#15803d',
        desc: 'Powered primarily by solar energy — lowest carbon footprint.',
    },
    "Lowest Cost": {
        icon: DollarSign, color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc',
        badge: '#e0f2fe', badgeText: '#0369a1',
        desc: 'Cheapest total tariff window across the next 24 hours.',
    },
    "Grid Safe": {
        icon: Shield, color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd',
        badge: '#ede9fe', badgeText: '#6d28d9',
        desc: 'Transformer utilisation is lowest — no grid stress risk.',
    },
    "Balanced": {
        icon: Zap, color: '#d97706', bg: '#fffbeb', border: '#fcd34d',
        badge: '#fef3c7', badgeText: '#b45309',
        desc: 'Good balance of cost, grid load, and solar availability.',
    },
};

/* ── Single suggestion card ─────────────────────────────── */
const SlotCard = ({ slot, onSelect, booking }) => {
    const cfg = TAG_CONFIG[slot.tag] || TAG_CONFIG["Balanced"];
    const Icon = cfg.icon;
    const busy = booking === slot.start;

    return (
        <div style={{
            border: `2px solid ${cfg.border}`,
            borderRadius: 16,
            background: cfg.bg,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flex: '1 1 220px',
            minWidth: 200,
            maxWidth: 320,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
        >
            {/* Tag badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: cfg.badge, color: cfg.badgeText,
                    borderRadius: 99, padding: '4px 10px',
                    fontSize: '0.72rem', fontWeight: 700,
                }}>
                    <Icon size={12} /> {slot.tag}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>
                    Rank #{slot.rank}
                </span>
            </div>

            {/* Time range */}
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    {slot.start} – {slot.end}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{cfg.desc}</div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: cfg.color }}>₹{slot.cost_inr}</div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cost</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                        fontSize: '1rem', fontWeight: 700,
                        color: slot.grid_load_pct > 80 ? '#dc2626' : slot.grid_load_pct > 60 ? '#d97706' : '#16a34a'
                    }}>
                        {slot.grid_load_pct}%
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grid</div>
                </div>
                {slot.solar && (
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>☀️</div>
                        <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Solar</div>
                    </div>
                )}
            </div>

            {/* Score bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: 4 }}>
                    <span>AI Score</span><span style={{ fontWeight: 700, color: cfg.color }}>{slot.score}/100</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 99, height: 5 }}>
                    <div style={{ width: `${slot.score}%`, background: cfg.color, borderRadius: 99, height: 5, transition: 'width 0.6s ease' }} />
                </div>
            </div>

            {/* Book button */}
            <button
                onClick={() => onSelect(slot)}
                disabled={!!booking}
                style={{
                    width: '100%', padding: '10px 0',
                    background: busy ? '#e5e7eb' : cfg.color,
                    color: busy ? '#9ca3af' : 'white',
                    border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.875rem',
                    cursor: booking ? 'wait' : 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
            >
                {busy ? 'Booking…' : <><Zap size={14} /> Select & Book</>}
            </button>
        </div>
    );
};

/* ── Main modal component ───────────────────────────────── */
const SlotSuggestions = ({ suggestions, onBook, onDismiss, loading }) => {
    const [booking, setBooking] = React.useState(null);
    const [booked, setBooked] = React.useState(null);
    const [bookingError, setBookingError] = React.useState(null);

    const handleSelect = async (slot) => {
        setBooking(slot.start);
        setBookingError(null);
        try {
            await onBook(slot);
            setBooked(slot);
        } catch (err) {
            setBookingError(err.message || 'Booking failed. Please try again.');
            setBooking(null);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
        }}>
            <div style={{
                background: 'white', borderRadius: 20,
                padding: 28, width: '100%', maxWidth: 820,
                boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                position: 'relative',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Close button */}
                <button onClick={onDismiss} style={{
                    position: 'absolute', top: 16, right: 16,
                    background: '#f3f4f6', border: 'none', borderRadius: 8,
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#6b7280',
                }}>
                    <X size={16} />
                </button>

                {/* Header */}
                {!booked ? (
                    <>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{
                                background: '#ede9fe', color: '#7c3aed',
                                borderRadius: 99, padding: '4px 12px',
                                fontSize: '0.72rem', fontWeight: 700,
                            }}>
                                🤖 AI Smart Slot Suggestions
                            </span>
                        </div>
                        <h2 style={{ margin: '8px 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                            Your requested time is under grid stress
                        </h2>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
                            The AI scheduler analysed the next 24 hours and found these optimised alternatives. Pick one to confirm.
                        </p>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Analysing grid windows…</div>
                        ) : (
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {suggestions.map(s => (
                                    <SlotCard key={s.start} slot={s} onSelect={handleSelect} booking={booking} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* ── Success state ── */
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <CheckCircle size={52} color="#16a34a" style={{ marginBottom: 12 }} />
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                            Slot Booked!
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: 16 }}>
                            <strong>{booked.tag}</strong> slot confirmed: <strong>{booked.start} – {booked.end}</strong>
                        </p>
                        <div style={{ display: 'inline-flex', gap: 20, background: '#f9fafb', borderRadius: 12, padding: '12px 24px' }}>
                            <span>💰 ₹{booked.cost_inr}</span>
                            <span>⚡ Grid {booked.grid_load_pct}%</span>
                            {booked.solar && <span>☀️ Solar powered</span>}
                        </div>
                        <br />
                        <button
                            onClick={onDismiss}
                            style={{
                                marginTop: 20, padding: '10px 28px',
                                background: '#2563eb', color: 'white',
                                border: 'none', borderRadius: 9, fontWeight: 700,
                                cursor: 'pointer', fontSize: '0.9rem',
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlotSuggestions;
