import React from 'react';
import './EventFilters.css';

const EventFilters = ({ minRating, onMinRatingChange, sort, onSortChange }) => (
    <div className="event-filters">
        <div className="event-filter-field">
            <label htmlFor="minRating">Minimum rating</label>
            <select
                id="minRating"
                className="form-select"
                value={minRating}
                onChange={(e) => onMinRatingChange(e.target.value)}
            >
                <option value="">Any rating</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
                <option value="1">1+ stars</option>
            </select>
        </div>
        <div className="event-filter-field">
            <label htmlFor="sort">Sort by</label>
            <select
                id="sort"
                className="form-select"
                value={sort}
                onChange={(e) => onSortChange(e.target.value)}
            >
                <option value="">Default</option>
                <option value="newest">Newest</option>
                <option value="rating">Highest Rated</option>
                <option value="bookings">Most Booked</option>
            </select>
        </div>
    </div>
);

export default EventFilters;
