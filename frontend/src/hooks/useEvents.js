import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const PAGE_LIMIT = 12;

export default function useEvents({ category, search, minRating, sort } = {}) {
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const requestId = useRef(0);

    useEffect(() => {
        if (search !== undefined && !search) {
            setEvents([]);
            setHasMore(false);
            setError(null);
            return;
        }

        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);

        api.get('/events', { params: { category, search, minRating, sort, page: 1, limit: PAGE_LIMIT } })
            .then(response => {
                if (currentRequest !== requestId.current) return;
                setEvents(response.data.events);
                setPage(1);
                setHasMore(response.data.hasMore);
            })
            .catch(() => {
                if (currentRequest !== requestId.current) return;
                setEvents([]);
                setHasMore(false);
                setError('Could not load events. Please try again later.');
            })
            .finally(() => {
                if (currentRequest !== requestId.current) return;
                setLoading(false);
            });

        return () => {
            requestId.current += 1;
        };
    }, [category, search, minRating, sort]);

    const loadMore = useCallback(() => {
        if (loadingMore || loading || !hasMore) return;

        const nextPage = page + 1;
        setLoadingMore(true);

        api.get('/events', { params: { category, search, minRating, sort, page: nextPage, limit: PAGE_LIMIT } })
            .then(response => {
                setEvents((current) => [...current, ...response.data.events]);
                setPage(nextPage);
                setHasMore(response.data.hasMore);
            })
            .catch(() => setError('Could not load more events.'))
            .finally(() => setLoadingMore(false));
    }, [category, search, minRating, sort, page, hasMore, loading, loadingMore]);

    return { events, loading, loadingMore, hasMore, error, loadMore };
}
