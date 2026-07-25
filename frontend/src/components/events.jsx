import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './header';
import Skeleton from './Skeleton.jsx';
import EventCard from './EventCard.jsx';
import EventFilters from './EventFilters.jsx';
import { Reveal, StaggerGroup, StaggerItem } from './Reveal.jsx';
import useEvents from '../hooks/useEvents';
import { CATEGORIES } from '../categories';
import './events.css';
import './category.css';

const Events = () => {
    const navigate = useNavigate();
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
                <Reveal>
                    <h1>Event Categories</h1>
                    <p className="events-categories-intro">
                        From dream weddings to milestone birthdays and flawless corporate events —
                        browse by category below, or search for something specific.
                    </p>
                </Reveal>

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
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div key="loading" exit={{ opacity: 0 }}>
                                    <Skeleton count={3} />
                                </motion.div>
                            ) : results.length > 0 ? (
                                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                                    <StaggerGroup className="events-gallery">
                                        {results.map((event) => (
                                            <StaggerItem key={event._id}>
                                                <EventCard event={event} />
                                            </StaggerItem>
                                        ))}
                                    </StaggerGroup>
                                    {hasMore && <div ref={observerCallback} className="events-scroll-sentinel" />}
                                    {loadingMore && <Skeleton count={3} />}
                                </motion.div>
                            ) : (
                                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No events match "{query}".</motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <StaggerGroup className="categories-list">
                        {CATEGORIES.map((category) => (
                            <StaggerItem
                                key={category.id}
                                className="category-card"
                                onClick={() => navigate(`/category/${category.id}`)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/category/${category.id}`)}
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                            >
                                {category.imageUrl ? (
                                    <img
                                        src={category.imageUrl}
                                        alt={`${category.name} category`}
                                        className="category-image"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="category-image category-image-icon">
                                        <i className={`bi ${category.icon}`}></i>
                                    </div>
                                )}
                                <h2>{category.name}</h2>
                                <Link
                                    to={`/category/${category.id}`}
                                    className="category-link"
                                    aria-label={`View events in the ${category.name} category`}
                                >
                                    View {category.name}
                                </Link>
                            </StaggerItem>
                        ))}
                    </StaggerGroup>
                )}
            </section>
        </div>
    );
};

export default Events;
