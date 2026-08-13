import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Events the current admin/manager can act on — admins see every event,
// managers only the ones assigned to them (Event.manager). Shared by every
// admin page that needs this list (Manage Events, Bookings' event filter, ...)
// so the scoping rule lives in exactly one place.
export function useAdminEvents() {
    const { isAdmin, userId } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(() => {
        setLoading(true);
        return api.get('/events', { params: { limit: 1000 } })
            .then(response => {
                const own = isAdmin
                    ? response.data.events
                    : response.data.events.filter((event) => event.manager === userId);
                setEvents(own);
                return own;
            })
            .finally(() => setLoading(false));
    }, [isAdmin, userId]);

    useEffect(() => { reload(); }, [reload]);

    return { events, loading, reload };
}
