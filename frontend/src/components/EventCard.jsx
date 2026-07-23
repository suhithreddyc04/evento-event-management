import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.jsx';
import FavoriteButton from './FavoriteButton.jsx';

const EventCard = ({ event, onFavoriteChange }) => (
    <div className="event-card">
        <div className="event-card-image-wrap">
            <img
                src={event.imageUrl}
                alt={event.name}
                loading="lazy"
                className="event-image"
            />
            <FavoriteButton
                eventId={event._id}
                isFavorited={event.isFavorited}
                onChange={(next) => onFavoriteChange?.(event._id, next)}
                className="event-card-favorite"
            />
        </div>
        <h2>{event.name}</h2>
        {event.reviewCount > 0 && (
            <div className="card-rating">
                <StarRating value={event.avgRating} />
                <span>({event.reviewCount})</span>
            </div>
        )}
        <p>{event.description}</p>
        <Link to={`/events/${event._id}`} className="event-details-link">
            View Details
        </Link>
    </div>
);

export default EventCard;
