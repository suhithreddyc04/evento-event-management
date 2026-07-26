import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '../layout/Header';
import Skeleton from '../shared/Skeleton.jsx';
import EventCard from './EventCard.jsx';
import EventFilters from './EventFilters.jsx';
import { Reveal, StaggerGroup, StaggerItem } from '../shared/Reveal.jsx';
import useEvents from '../../hooks/useEvents';
import { getCategory } from '../../lib/categories';
import './Category.css';

const CategoryEvents = () => {
    const { categoryId } = useParams();
    const category = getCategory(categoryId);
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
                <Reveal>
                    <h1>{category?.name || 'Events'}</h1>
                    <p className="category-description">
                        {category?.description || 'Explore our events and find the perfect one for your needs.'}
                    </p>
                </Reveal>
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
                    ) : error ? (
                        <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>
                    ) : events.length > 0 ? (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                            <StaggerGroup className="events-gallery">
                                {events.map((event) => (
                                    <StaggerItem key={event._id}>
                                        <EventCard event={event} />
                                    </StaggerItem>
                                ))}
                            </StaggerGroup>
                            {hasMore && <div ref={observerCallback} className="events-scroll-sentinel" />}
                            {loadingMore && <Skeleton count={3} />}
                        </motion.div>
                    ) : (
                        <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No events available in this category.</motion.p>
                    )}
                </AnimatePresence>
            </section>
        </div>
    );
};

export default CategoryEvents;
