import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminEvents } from '../../hooks/useAdminEvents';
import './admin.css';

const AdminEvents = () => {
    const { isAuthenticated, isAdmin, isManager } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const { events, loading, reload } = useAdminEvents();
    const [managers, setManagers] = useState([]);
    const [lowRatingCounts, setLowRatingCounts] = useState({});

    useEffect(() => {
        if (!isAuthenticated || !isManager) return;

        api.get('/admin/reviews')
            .then(response => {
                const counts = {};
                response.data.forEach((review) => {
                    if (review.rating <= 2 && review.event) {
                        counts[review.event._id] = (counts[review.event._id] || 0) + 1;
                    }
                });
                setLowRatingCounts(counts);
            })
            .catch(() => {});

        if (isAdmin) {
            api.get('/admin/users')
                .then(response => setManagers(response.data))
                .catch(() => {});
        }
    }, [isAuthenticated, isManager, isAdmin]);

    if (!isAuthenticated || !isManager) {
        return <Navigate to="/home" replace />;
    }

    const handleDelete = (eventId) => {
        if (!window.confirm('Delete this event? This also removes any bookings for it.')) return;

        api.delete(`/admin/events/${eventId}`)
            .then(() => {
                toast.success('Event deleted.');
                reload();
            })
            .catch(() => toast.error('Could not delete event.'));
    };

    const handleToggleComplete = (event) => {
        api.put(`/admin/events/${event._id}/complete`, { completed: !event.completed })
            .then(() => {
                toast.success(event.completed ? 'Event reopened.' : 'Event marked as completed.');
                reload();
            })
            .catch(() => toast.error('Could not update event status.'));
    };

    const handleAssignManager = (eventId, managerId) => {
        api.put(`/admin/events/${eventId}/manager`, { managerId: managerId || null })
            .then(() => {
                toast.success(managerId ? 'Manager assigned.' : 'Manager unassigned.');
                reload();
            })
            .catch(err => toast.error(err.response?.data?.message || 'Could not assign manager.'));
    };

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>{isAdmin ? 'Admin' : 'Manage Events'}</h1>
                <AdminNav />

                <h2>Existing Events ({events.length})</h2>
                {loading ? (
                    <p>Loading events...</p>
                ) : (
                    <div className="admin-events-table-wrapper">
                        <table className="admin-events-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Capacity</th>
                                    <th>Price</th>
                                    <th>Advance</th>
                                    <th>Status</th>
                                    {isAdmin && <th>Manager</th>}
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event._id}>
                                        <td>
                                            {event.name}
                                            {lowRatingCounts[event._id] > 0 && (
                                                <span
                                                    className="admin-flaw-indicator"
                                                    title={`${lowRatingCounts[event._id]} low-rated review${lowRatingCounts[event._id] === 1 ? '' : 's'}`}
                                                >
                                                    ⚠ {lowRatingCounts[event._id]}
                                                </span>
                                            )}
                                        </td>
                                        <td>{event.category}</td>
                                        <td>{event.capacity ?? 'Unlimited'}</td>
                                        <td>{event.price != null ? `₹${event.price}` : 'Contact us'}</td>
                                        <td>{event.advanceAmount != null ? `₹${event.advanceAmount}` : 'None'}</td>
                                        <td>
                                            {event.bookedCount > 0 ? (
                                                <span className={`admin-status-badge ${event.completed ? 'is-completed' : 'is-upcoming'}`}>
                                                    {event.completed ? 'Completed' : 'Upcoming'}
                                                </span>
                                            ) : (
                                                <span className="admin-status-none">No bookings yet</span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={event.manager || ''}
                                                    onChange={(e) => handleAssignManager(event._id, e.target.value)}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {managers.map((user) => (
                                                        <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                                                    ))}
                                                </select>
                                            </td>
                                        )}
                                        <td className="admin-row-actions">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/admin/events/${event._id}/edit`)}>Edit</button>
                                            {event.bookedCount > 0 && (
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleToggleComplete(event)}>
                                                    {event.completed ? 'Reopen' : 'Complete Event'}
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(event._id)}>Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AdminEvents;
