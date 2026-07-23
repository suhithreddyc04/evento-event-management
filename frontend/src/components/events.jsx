import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './header';
import api from '../api';
import Skeleton from './Skeleton.jsx';
import './events.css';
import './category.css';

const categories = [
    {
        id: 'wedding',
        name: 'Weddings',
        imageUrl: '/images/m2.jpg',
    },
    {
        id: 'corporate',
        name: 'Corporate Events',
        imageUrl: '/images/ce2.jpg',
    },
    {
        id: 'birthday',
        name: 'Birthdays',
        imageUrl: '/images/b2.jpg',
    },
    {
        id: 'reunion',
        name: 'Reunions',
        imageUrl: '/images/g2.jpg',
    },
];

const Events = () => {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const trimmed = search.trim();

        const timeoutId = setTimeout(() => {
            setQuery(trimmed);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search]);

    useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        setLoading(true);
        api.get('/events', { params: { search: query } })
            .then(response => setResults(response.data))
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [query]);

    return (
        <div>
            <Header />
            <section className="events-categories-section">
                <h1>Event Categories</h1>

                <div className="events-search">
                    <input
                        type="search"
                        className="events-search-input"
                        placeholder="Search events by name or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search events"
                    />
                </div>

                {query ? (
                    <div className="search-results">
                        {loading ? (
                            <Skeleton count={3} />
                        ) : results.length > 0 ? (
                            <div className="events-gallery">
                                {results.map((event) => (
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
                            <p>No events match "{query}".</p>
                        )}
                    </div>
                ) : (
                    <div className="categories-list">
                        {categories.map((category) => (
                            <div key={category.id} className="category-card">
                                <img
                                    src={category.imageUrl}
                                    alt={`${category.name} category`}
                                    className="category-image"
                                    loading="lazy"
                                />
                                <h2>{category.name}</h2>
                                <Link
                                    to={`/category/${category.id}`}
                                    className="category-link"
                                    aria-label={`View events in the ${category.name} category`}
                                >
                                    View {category.name}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Events;
