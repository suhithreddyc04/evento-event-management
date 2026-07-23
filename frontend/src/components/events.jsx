import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './header';
import Skeleton from './Skeleton.jsx';
import EventCard from './EventCard.jsx';
import EventFilters from './EventFilters.jsx';
import useEvents from '../hooks/useEvents';
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

    useEffect(() => {
        const trimmed = search.trim();

        const timeoutId = setTimeout(() => {
            setQuery(trimmed);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search]);

    const [minRating, setMinRating] = useState('');
    const [sort, setSort] = useState('');
    const { events: results, loading, loadingMore, hasMore, loadMore } = useEvents({ search: query, minRating, sort });
    const sentinelRef = useRef(null);

    const observerCallback = useCallback((node) => {
        sentinelRef.current = node;
    }, []);

    useEffect(() => {
        if (!sentinelRef.current) return undefined;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) loadMore();
        }, { rootMargin: '200px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [loadMore, results.length]);

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
                        <EventFilters
                            minRating={minRating}
                            onMinRatingChange={setMinRating}
                            sort={sort}
                            onSortChange={setSort}
                        />
                        {loading ? (
                            <Skeleton count={3} />
                        ) : results.length > 0 ? (
                            <>
                                <div className="events-gallery">
                                    {results.map((event) => (
                                        <EventCard key={event._id} event={event} />
                                    ))}
                                </div>
                                {hasMore && <div ref={observerCallback} className="events-scroll-sentinel" />}
                                {loadingMore && <Skeleton count={3} />}
                            </>
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
