import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from './header';
import Skeleton from './Skeleton.jsx';
import EventCard from './EventCard.jsx';
import EventFilters from './EventFilters.jsx';
import useEvents from '../hooks/useEvents';
import './category.css';

const categoryDescriptions = {
    wedding: 'Celebrate your love with memorable weddings at exquisite venues, tailored for your perfect day.',
    corporate: 'Host professional and impactful corporate events with state-of-the-art facilities and services.',
    birthday: 'Make birthdays unforgettable with vibrant themes, fun activities, and delightful surprises.',
    reunion: 'Reconnect with loved ones in heartwarming family reunions at beautiful destinations.',
};

const CategoryEvents = () => {
    const { categoryId } = useParams();
    const [minRating, setMinRating] = useState('');
    const [sort, setSort] = useState('');
    const { events, loading, loadingMore, hasMore, error, loadMore } = useEvents({ category: categoryId, minRating, sort });
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
    }, [loadMore, events.length]);

    return (
        <div>
            <Header />
            <section className="events-section">
                <h1>{categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Events</h1>
                <p className="category-description">
                    {categoryDescriptions[categoryId] || 'Explore our events and find the perfect one for your needs.'}
                </p>
                <EventFilters
                    minRating={minRating}
                    onMinRatingChange={setMinRating}
                    sort={sort}
                    onSortChange={setSort}
                />
                {loading ? (
                    <Skeleton count={3} />
                ) : error ? (
                    <p>{error}</p>
                ) : events.length > 0 ? (
                    <>
                        <div className="events-gallery">
                            {events.map((event) => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                        {hasMore && <div ref={observerCallback} className="events-scroll-sentinel" />}
                        {loadingMore && <Skeleton count={3} />}
                    </>
                ) : (
                    <p>No events available in this category.</p>
                )}
            </section>
        </div>
    );
};

export default CategoryEvents;
