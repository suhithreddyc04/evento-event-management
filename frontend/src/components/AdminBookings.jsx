import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../ToastContext';

const AdminBookings = ({ events }) => {
    const toast = useToast();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState('');
    const [finalAmountDrafts, setFinalAmountDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        setLoading(true);
        api.get('/admin/bookings', { params: eventFilter ? { eventId: eventFilter } : {} })
            .then(response => {
                setBookings(response.data);
                setFinalAmountDrafts(
                    Object.fromEntries(response.data.map((booking) => [booking._id, booking.finalAmount ?? '']))
                );
            })
            .catch(() => toast.error('Could not load bookings.'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventFilter]);

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

    return (
        <div className="admin-bookings">
            <div className="mb-3 admin-bookings-filter">
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

            <h2>Bookings ({bookings.length})</h2>

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
                                            booking.status === 'waitlisted' ? 'is-waitlisted'
                                                : booking.status === 'pending_payment' ? 'is-upcoming'
                                                    : 'is-completed'
                                        }`}>
                                            {booking.status === 'waitlisted' ? 'Waitlisted'
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
    );
};

export default AdminBookings;
