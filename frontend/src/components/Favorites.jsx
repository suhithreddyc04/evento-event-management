import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './header';
import Skeleton from './Skeleton.jsx';
import EventCard from './EventCard.jsx';
import { Reveal } from './Reveal.jsx';
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
                <Reveal><h1>My Favorites</h1></Reveal>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loading" exit={{ opacity: 0 }}>
                            <Skeleton count={3} />
                        </motion.div>
                    ) : events.length > 0 ? (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                            <motion.div className="events-gallery" layout>
                                <AnimatePresence>
                                    {events.map((event) => (
                                        <motion.div
                                            key={event._id}
                                            layout
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.85 }}
                                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            <EventCard event={event} onFavoriteChange={handleFavoriteChange} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div key="empty" className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <i className="bi bi-heart"></i>
                            <h3>No favorites yet</h3>
                            <p>Save events you love and they'll show up here for quick access later.</p>
                            <Link to="/events" className="btn btn-primary">Browse Events</Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </div>
    );
};

export default Favorites;
