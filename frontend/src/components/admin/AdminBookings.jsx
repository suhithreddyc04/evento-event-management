import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminEvents } from '../../hooks/useAdminEvents';
import './admin.css';

const AdminBookings = () => {
    const { isAuthenticated, isManager } = useAuth();
    const toast = useToast();
    const { events } = useAdminEvents();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState('');
    // 'active' mirrors the old default view (hides completed events and
    // already-resolved cancellations); 'cancelled' is its own explicit view
    // of every cancelled booking, resolved or not — so a cancellation is
    // never just mixed in with everything else.
    const [statusFilter, setStatusFilter] = useState('active');
    const [finalAmountDrafts, setFinalAmountDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [refundActionId, setRefundActionId] = useState(null);

    useEffect(() => {
        if (!isAuthenticated || !isManager) return;

        setLoading(true);
        const params = {};
        if (eventFilter) params.eventId = eventFilter;
        if (statusFilter === 'cancelled') params.status = 'cancelled';

        api.get('/admin/bookings', { params })
            .then(response => {
                setBookings(response.data);
                setFinalAmountDrafts(
                    Object.fromEntries(response.data.map((booking) => [booking._id, booking.finalAmount ?? '']))
                );
            })
            .catch(() => toast.error('Could not load bookings.'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventFilter, statusFilter, isAuthenticated, isManager]);

    if (!isAuthenticated || !isManager) {
        return <Navigate to="/home" replace />;
    }

    const handleSaveFinalAmount = (bookingId) => {
        setSavingId(bookingId);
        api.put(`/admin/bookings/${bookingId}/final-amount`, { finalAmount: finalAmountDrafts[bookingId] })
            .then(({ data: updated }) => {
                setBookings((current) => current.map((b) => (
                    b._id === bookingId ? { ...b, finalAmount: updated.finalAmount, finalPaymentStatus: updated.finalPaymentStatus } : b
                )));
                toast.success('Final amount updated.');
            })
            .catch(err => toast.error(err.response?.data?.message || 'Could not update final amount.'))
            .finally(() => setSavingId(null));
    };

    const handleRefundAction = (bookingId, action) => {
        setRefundActionId(bookingId);
        api.post(`/admin/bookings/${bookingId}/refund/${action}`)
            .then(({ data: updated }) => {
                setBookings((current) => current.map((b) => (
                    b._id === bookingId
                        ? { ...b, refundStatus: updated.refundStatus, refundedAmount: updated.refundedAmount, refundId: updated.refundId }
                        : b
                )));
                toast.success(
                    action === 'approve'
                        ? (updated.refundStatus === 'refunded' ? `Refunded ₹${updated.refundedAmount}.` : 'Refund approved, but the Razorpay call failed — check the Razorpay dashboard.')
                        : 'Refund request declined.'
                );
            })
            .catch(err => toast.error(err.response?.data?.message || 'Could not process the refund.'))
            .finally(() => setRefundActionId(null));
    };

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>Bookings</h1>
                <AdminNav />

                <div className="admin-bookings">
                    <div className="admin-bookings-toolbar">
                        <div className="admin-tabs admin-bookings-status-tabs">
                            <button
                                type="button"
                                className={`admin-tab-button ${statusFilter === 'active' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('active')}
                            >
                                Active
                            </button>
                            <button
                                type="button"
                                className={`admin-tab-button ${statusFilter === 'cancelled' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('cancelled')}
                            >
                                Cancelled
                            </button>
                        </div>

                        <div className="admin-bookings-filter">
                            <label className="form-label">Filter by event</label>
                            <select className="form-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                                <option value="">All events</option>
                                {events.map((event) => (
                                    <option key={event._id} value={event._id}>
                                        {event.name}{event.completed ? ' (Completed)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <h2>{statusFilter === 'cancelled' ? 'Cancelled Bookings' : 'Bookings'} ({bookings.length})</h2>

                    {loading ? (
                <p>Loading bookings...</p>
            ) : bookings.length === 0 ? (
                <p>No bookings yet.</p>
            ) : (
                <div className="admin-events-table-wrapper">
                    <table className="admin-events-table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Requested Date</th>
                                <th>Status</th>
                                <th>Advance</th>
                                <th>Refund</th>
                                <th>Final Amount</th>
                                <th>Booked On</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((booking) => (
                                <tr key={booking._id}>
                                    <td>{booking.event?.name || 'Deleted event'}</td>
                                    <td>{booking.name}</td>
                                    <td>{booking.email}</td>
                                    <td>{booking.phone}</td>
                                    <td>{new Date(booking.date).toLocaleString()}</td>
                                    <td>
                                        <span className={`admin-status-badge ${
                                            booking.status === 'cancelled' ? 'is-cancelled'
                                                : booking.status === 'waitlisted' ? 'is-waitlisted'
                                                    : booking.status === 'pending_payment' ? 'is-upcoming'
                                                        : 'is-completed'
                                        }`}>
                                            {booking.status === 'cancelled' ? 'Cancelled'
                                                : booking.status === 'waitlisted' ? 'Waitlisted'
                                                    : booking.status === 'pending_payment' ? 'Payment Pending'
                                                        : 'Confirmed'}
                                        </span>
                                    </td>
                                    <td>
                                        {booking.advanceAmount == null
                                            ? '—'
                                            : booking.status === 'pending_payment'
                                                ? `Pending ₹${booking.advanceAmount}`
                                                : `Paid ₹${booking.advanceAmount}`}
                                    </td>
                                    <td>
                                        {booking.refundStatus === 'not_applicable' ? '—'
                                            : (booking.refundStatus === 'requested' || booking.refundStatus === 'failed') ? (
                                                <div className="admin-refund-actions">
                                                    <span className={`admin-status-badge ${booking.refundStatus === 'failed' ? 'is-cancelled' : 'is-upcoming'}`}>
                                                        {booking.refundStatus === 'failed' ? 'Refund failed' : `Requested ₹${booking.refundRequestedAmount}`}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => handleRefundAction(booking._id, 'approve')}
                                                        disabled={refundActionId === booking._id}
                                                    >
                                                        {refundActionId === booking._id ? '...' : booking.refundStatus === 'failed' ? 'Retry' : 'Approve'}
                                                    </button>
                                                    {booking.refundStatus === 'requested' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleRefundAction(booking._id, 'reject')}
                                                            disabled={refundActionId === booking._id}
                                                        >
                                                            Reject
                                                        </button>
                                                    )}
                                                </div>
                                            ) : booking.refundStatus === 'refunded' ? (
                                                <span className="admin-status-badge is-completed">Refunded ₹{booking.refundedAmount}</span>
                                            ) : (
                                                <span className="admin-status-badge is-cancelled">Declined</span>
                                            )}
                                    </td>
                                    <td>
                                        {booking.status === 'confirmed' ? (
                                            <div className="admin-final-amount-editor">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="form-control form-control-sm"
                                                    placeholder="None"
                                                    value={finalAmountDrafts[booking._id] ?? ''}
                                                    onChange={(e) => setFinalAmountDrafts((current) => ({ ...current, [booking._id]: e.target.value }))}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleSaveFinalAmount(booking._id)}
                                                    disabled={savingId === booking._id}
                                                >
                                                    {savingId === booking._id ? '...' : 'Save'}
                                                </button>
                                                {booking.finalPaymentStatus === 'paid' && (
                                                    <span className="admin-final-amount-paid">Paid</span>
                                                )}
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AdminBookings;
