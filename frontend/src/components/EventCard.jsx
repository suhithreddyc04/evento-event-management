import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StarRating from './StarRating.jsx';
import FavoriteButton from './FavoriteButton.jsx';

const EventCard = ({ event, onFavoriteChange }) => {
    const navigate = useNavigate();
    const goToEvent = () => navigate(`/events/${event._id}`);

    return (
        <motion.div
            className="event-card"
            whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(36, 27, 58, 0.18)' }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={goToEvent}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToEvent()}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
        >
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
            <p className="event-card-price">
                {event.price != null ? `₹${event.price.toLocaleString('en-IN')}` : 'Contact for pricing'}
            </p>
            <span className="event-details-link">
                View Details
            </span>
        </motion.div>
    );
};

export default EventCard;
