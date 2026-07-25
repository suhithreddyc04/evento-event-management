import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from './header.jsx';
import Skeleton from './Skeleton.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { payForBooking, payFinalAmount } from '../payment';
import { Reveal } from './Reveal.jsx';
import './myBookings.css';

const humanize = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const MyBookings = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);
    const [payingId, setPayingId] = useState(null);
    const [payingFinalId, setPayingFinalId] = useState(null);

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

    const handlePayNow = (booking) => {
        setPayingId(booking._id);
        payForBooking(booking, {
            onSuccess: (updatedBooking) => {
                // Merge only the payment-relevant fields — updatedBooking.event is an
                // unpopulated id, and booking.event here is the populated event object.
                setBookings((current) => current.map((b) => (
                    b._id === updatedBooking._id
                        ? { ...b, status: updatedBooking.status, razorpayPaymentId: updatedBooking.razorpayPaymentId }
                        : b
                )));
                toast.success('Payment received! Your booking is confirmed.');
                setPayingId(null);
            },
            onDismiss: () => setPayingId(null),
            onError: () => {
                toast.error('Payment could not be processed. Please try again.');
                setPayingId(null);
            },
        });
    };

    const handlePayFinal = (booking) => {
        setPayingFinalId(booking._id);
        payFinalAmount(booking, {
            onSuccess: (updatedBooking) => {
                setBookings((current) => current.map((b) => (
                    b._id === updatedBooking._id
                        ? { ...b, finalPaymentStatus: updatedBooking.finalPaymentStatus, finalRazorpayPaymentId: updatedBooking.finalRazorpayPaymentId }
                        : b
                )));
                toast.success('Payment received! Balance settled.');
                setPayingFinalId(null);
            },
            onDismiss: () => setPayingFinalId(null),
            onError: () => {
                toast.error('Payment could not be processed. Please try again.');
                setPayingFinalId(null);
            },
        });
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div>
            <Header />
            <section className="my-bookings-section">
                <Reveal><h1>My Bookings</h1></Reveal>

                {loading ? (
                    <Skeleton count={3} />
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-calendar-x"></i>
                        <h3>No bookings yet</h3>
                        <p>Your next celebration is just one click away.</p>
                        <Link to="/events" className="btn btn-primary">Browse Events</Link>
                    </div>
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
                                    <div className="booking-title-row">
                                        <h2>{booking.event?.name || 'Event no longer available'}</h2>
                                        <span className={`booking-status-badge ${
                                            booking.status === 'waitlisted' ? 'is-waitlisted'
                                                : booking.status === 'pending_payment' ? 'is-pending-payment'
                                                    : 'is-confirmed'
                                        }`}>
                                            {booking.status === 'waitlisted' ? 'Waitlisted'
                                                : booking.status === 'pending_payment' ? 'Payment Pending'
                                                    : 'Confirmed'}
                                        </span>
                                        {booking.event?.completed && booking.finalPaymentStatus === 'pending' ? (
                                            <span className="booking-status-badge is-pending-payment">Awaiting Final Payment</span>
                                        ) : booking.event?.completed && (
                                            <span className="booking-status-badge is-event-completed">Event Completed</span>
                                        )}
                                        {booking.finalPaymentStatus === 'paid' && (
                                            <span className="booking-status-badge is-confirmed">Balance Paid</span>
                                        )}
                                    </div>
                                    <p><strong>Requested date:</strong> {new Date(booking.date).toLocaleString()}</p>
                                    <p><strong>Name:</strong> {booking.name}</p>
                                    {booking.address && <p><strong>Venue address:</strong> {booking.address}</p>}
                                    <p><strong>Contact email:</strong> {booking.email}</p>
                                    {booking.phone && <p><strong>Contact phone:</strong> {booking.phone}</p>}
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
                                        {booking.status === 'pending_payment' && (
                                            <button
                                                className="btn btn-primary btn-sm pay-now-btn"
                                                onClick={() => handlePayNow(booking)}
                                                disabled={payingId === booking._id}
                                            >
                                                {payingId === booking._id ? 'Processing...' : `Pay Now (₹${booking.advanceAmount})`}
                                            </button>
                                        )}
                                        {booking.finalPaymentStatus === 'pending' && (
                                            <button
                                                className="btn btn-primary btn-sm pay-now-btn"
                                                onClick={() => handlePayFinal(booking)}
                                                disabled={payingFinalId === booking._id}
                                            >
                                                {payingFinalId === booking._id ? 'Processing...' : `Pay Remaining (₹${booking.finalAmount})`}
                                            </button>
                                        )}
                                        {(booking.event?.completed || booking.finalPaymentStatus === 'paid') ? (
                                            booking.finalPaymentStatus !== 'pending' && (
                                                <Link to={`/events/${booking.event._id}#reviews`} className="btn btn-outline-primary btn-sm">
                                                    Leave a Review
                                                </Link>
                                            )
                                        ) : (
                                            <button
                                                className="btn btn-outline-danger btn-sm cancel-booking-btn"
                                                onClick={() => handleCancel(booking._id)}
                                                disabled={cancellingId === booking._id}
                                            >
                                                {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                            </button>
                                        )}
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
