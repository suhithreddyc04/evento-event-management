import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from './header';
import Skeleton from './Skeleton.jsx';
import EventCard from './EventCard.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import './category.css';

const Favorites = () => {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        api.get('/favorites/mine')
            .then(response => setEvents(response.data))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleFavoriteChange = (eventId, isFavorited) => {
        if (!isFavorited) {
            setEvents((current) => current.filter((event) => event._id !== eventId));
        }
    };

    return (
        <div>
            <Header />
            <section className="events-section">
                <h1>My Favorites</h1>

                {loading ? (
                    <Skeleton count={3} />
                ) : events.length > 0 ? (
                    <div className="events-gallery">
                        {events.map((event) => (
                            <EventCard key={event._id} event={event} onFavoriteChange={handleFavoriteChange} />
                        ))}
                    </div>
                ) : (
                    <p>
                        You haven't saved any events yet. <Link to="/events">Browse events</Link> to find some you love.
                    </p>
                )}
            </section>
        </div>
    );
};

export default Favorites;
