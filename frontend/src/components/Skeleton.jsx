import React from 'react';
import './skeleton.css';

// Renders `count` placeholder cards shaped like an event/category card, shown while data loads.
const Skeleton = ({ count = 3 }) => (
    <div className="events-gallery">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton-card">
                <div className="skeleton-block skeleton-image" />
                <div className="skeleton-block skeleton-line skeleton-title" />
                <div className="skeleton-block skeleton-line" />
                <div className="skeleton-block skeleton-line skeleton-short" />
            </div>
        ))}
    </div>
);

export default Skeleton;
