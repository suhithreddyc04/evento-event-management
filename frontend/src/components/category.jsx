import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from './header';
import api from '../api';
import Skeleton from './Skeleton.jsx';
import './category.css';

const categoryDescriptions = {
    wedding: 'Celebrate your love with memorable weddings at exquisite venues, tailored for your perfect day.',
    corporate: 'Host professional and impactful corporate events with state-of-the-art facilities and services.',
    birthday: 'Make birthdays unforgettable with vibrant themes, fun activities, and delightful surprises.',
    reunion: 'Reconnect with loved ones in heartwarming family reunions at beautiful destinations.',
};

const CategoryEvents = () => {
    const { categoryId } = useParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.get('/events', { params: { category: categoryId } })
            .then(response => setEvents(response.data))
            .catch(() => setError('Could not load events. Please try again later.'))
            .finally(() => setLoading(false));
    }, [categoryId]);

    return (
        <div>
            <Header />
            <section className="events-section">
                <h1 style={{ color: "hwb(263 0% 0%)" }}>{categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Events</h1>
                <p className="category-description">
                    {categoryDescriptions[categoryId] || 'Explore our events and find the perfect one for your needs.'}
                </p>
                {loading ? (
                    <Skeleton count={3} />
                ) : error ? (
                    <p>{error}</p>
                ) : events.length > 0 ? (
                    <div className="events-gallery">
                        {events.map((event) => (
                            <div key={event._id} className="event-card">
                                <img
                                    src={event.imageUrl}
                                    alt={event.name}
                                    loading="lazy"
                                    className="event-image"
                                />
                                <h2>{event.name}</h2>
                                <p>{event.description}</p>
                                <Link to={`/events/${event._id}`} className="event-details-link">
                                    View Details
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No events available in this category.</p>
                )}
            </section>
        </div>
    );
};

export default CategoryEvents;
