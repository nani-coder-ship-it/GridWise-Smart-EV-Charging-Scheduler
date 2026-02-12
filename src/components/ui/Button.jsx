import React from 'react';
import './Button.css';
import { clsx } from 'clsx';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}) => {
    return (
        <button
            className={clsx('btn', `btn-${variant}`, `btn-${size}`, className)}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
