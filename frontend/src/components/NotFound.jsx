import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
    <div className="d-flex flex-column justify-content-center align-items-center text-center vh-100">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', color: 'var(--color-primary)' }}>404</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Page not found.</p>
        <Link to="/home" className="btn btn-primary">Go Home</Link>
    </div>
);

export default NotFound;
