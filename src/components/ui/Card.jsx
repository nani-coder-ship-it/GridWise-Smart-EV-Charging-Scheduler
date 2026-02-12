import React from 'react';
import './Card.css';
import { clsx } from 'clsx';

const Card = ({ children, className, ...props }) => {
    return (
        <div className={clsx('card', className)} {...props}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className }) => (
    <div className={clsx('card-header', className)}>{children}</div>
);

export const CardTitle = ({ children, className }) => (
    <h3 className={clsx('card-title', className)}>{children}</h3>
);

export const CardContent = ({ children, className }) => (
    <div className={clsx('card-content', className)}>{children}</div>
);

export default Card;
