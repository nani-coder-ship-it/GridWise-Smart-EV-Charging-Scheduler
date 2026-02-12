import React from 'react';
import './Input.css';
import { clsx } from 'clsx';

const Input = React.forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className="input-wrapper">
            {label && <label className="input-label">{label}</label>}
            <input
                ref={ref}
                className={clsx('input-field', error && 'input-error', className)}
                {...props}
            />
            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
