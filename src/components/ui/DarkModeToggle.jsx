// src/components/ui/DarkModeToggle.jsx
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'gridwise-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
}

export default function DarkModeToggle() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    });

    // Apply on mount (in case localStorage had 'dark')
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggle = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
    };

    return (
        <button
            onClick={toggle}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
                background: 'none',
                border: '1.5px solid var(--border-color, #d1d5db)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'background 0.2s, border-color 0.2s',
                flexShrink: 0,
            }}
            aria-label="Toggle dark mode"
        >
            {theme === 'light'
                ? <Moon size={18} />
                : <Sun size={18} />
            }
        </button>
    );
}
