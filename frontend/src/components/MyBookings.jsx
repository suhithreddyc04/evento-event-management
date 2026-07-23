import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from './header.jsx';
import Skeleton from './Skeleton.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import './myBookings.css';

const humanize = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const MyBookings = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        api.get('/bookings/mine')
            .then(response => setBookings(response.data))
            .catch(() => setBookings([]))
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    const handleCancel = (bookingId) => {
        setCancellingId(bookingId);
        api.delete(`/bookings/${bookingId}`)
            .then(() => {
                setBookings((current) => current.filter((booking) => booking._id !== bookingId));
                toast.success('Booking cancelled.');
            })
            .catch(() => toast.error('Could not cancel booking. Please try again.'))
            .finally(() => setCancellingId(null));
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div>
            <Header />
            <section className="my-bookings-section">
                <h1>My Bookings</h1>

                {loading ? (
                    <Skeleton count={3} />
                ) : bookings.length === 0 ? (
                    <p>
                        You haven't booked any events yet. <Link to="/events">Browse events</Link> to get started.
                    </p>
                ) : (
                    <div className="bookings-list">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="booking-card">
                                {booking.event?.imageUrl && (
                                    <img
                                        src={booking.event.imageUrl}
                                        alt={booking.event.name}
                                        className="booking-image"
                                        loading="lazy"
                                    />
                                )}
                                <div className="booking-info">
                                    <h2>{booking.event?.name || 'Event no longer available'}</h2>
                                    <p><strong>Requested date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                                    <p><strong>Name:</strong> {booking.name}</p>
                                    {booking.address && <p><strong>Address:</strong> {booking.address}</p>}
                                    <p><strong>Contact email:</strong> {booking.email}</p>
                                    {booking.details && Object.entries(booking.details).filter(([, v]) => v).length > 0 && (
                                        <ul className="booking-detail-list">
                                            {Object.entries(booking.details).filter(([, v]) => v).map(([key, value]) => (
                                                <li key={key}><strong>{humanize(key)}:</strong> {value}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {booking.specialRequests && (
                                        <p><strong>Special requests:</strong> {booking.specialRequests}</p>
                                    )}
                                    <div className="booking-actions">
                                        {booking.event && (
                                            <Link to={`/events/${booking.event._id}`} className="event-details-link">
                                                View Event
                                            </Link>
                                        )}
                                        <button
                                            className="btn btn-outline-danger btn-sm cancel-booking-btn"
                                            onClick={() => handleCancel(booking._id)}
                                            disabled={cancellingId === booking._id}
                                        >
                                            {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default MyBookings;
