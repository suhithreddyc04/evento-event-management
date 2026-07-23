import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../ToastContext';
import Skeleton from './Skeleton.jsx';
import StarRating from './StarRating.jsx';

const formatDayLabel = (isoDate) => {
    const [, month, day] = isoDate.split('-');
    return `${month}/${day}`;
};

const AdminAnalytics = () => {
    const toast = useToast();
    const [stats, setStats] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/admin/analytics'),
            api.get('/admin/reviews'),
        ])
            .then(([analyticsRes, reviewsRes]) => {
                setStats(analyticsRes.data);
                setReviews(reviewsRes.data);
            })
            .catch(() => toast.error('Could not load analytics.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleDeleteReview = (reviewId) => {
        if (!window.confirm('Delete this review?')) return;

        setDeletingId(reviewId);
        api.delete(`/reviews/${reviewId}`)
            .then(() => {
                setReviews((current) => current.filter((review) => review._id !== reviewId));
                toast.success('Review deleted.');
            })
            .catch(() => toast.error('Could not delete review.'))
            .finally(() => setDeletingId(null));
    };

    if (loading) {
        return <Skeleton count={4} />;
    }

    if (!stats) {
        return <p>Could not load analytics.</p>;
    }

    const maxCount = Math.max(1, ...stats.bookingsByDay.map((day) => day.count));

    return (
        <div className="admin-analytics">
            <div className="admin-stats-grid">
                <div className="admin-stat-tile">
                    <span className="admin-stat-value">{stats.totalEvents}</span>
                    <span className="admin-stat-label">Events</span>
                </div>
                <div className="admin-stat-tile">
                    <span className="admin-stat-value">{stats.totalBookings}</span>
                    <span className="admin-stat-label">Bookings</span>
                </div>
                <div className="admin-stat-tile">
                    <span className="admin-stat-value">{stats.totalUsers}</span>
                    <span className="admin-stat-label">Users</span>
                </div>
                <div className="admin-stat-tile">
                    <span className="admin-stat-value">{stats.totalReviews}</span>
                    <span className="admin-stat-label">Reviews</span>
                </div>
            </div>

            <h2>Bookings, Last 14 Days</h2>
            <div className="admin-bar-chart" role="img" aria-label="Bookings per day over the last 14 days">
                {stats.bookingsByDay.map((day, index) => (
                    <div className="admin-bar-column" key={day.date}>
                        <div
                            className="admin-bar"
                            style={{ height: `${(day.count / maxCount) * 100}%` }}
                            title={`${day.date}: ${day.count} booking${day.count === 1 ? '' : 's'}`}
                        >
                            {day.count > 0 && <span className="admin-bar-value">{day.count}</span>}
                        </div>
                        {index % 3 === 0 && <span className="admin-bar-label">{formatDayLabel(day.date)}</span>}
                    </div>
                ))}
            </div>

            <h2>Top Rated Events</h2>
            {stats.topRatedEvents.length === 0 ? (
                <p>No reviews yet.</p>
            ) : (
                <ol className="admin-top-rated-list">
                    {stats.topRatedEvents.map((event) => (
                        <li key={event._id} className="admin-top-rated-row">
                            <img src={event.imageUrl} alt={event.name} className="admin-top-rated-image" />
                            <div className="admin-top-rated-info">
                                <Link to={`/events/${event._id}`}>{event.name}</Link>
                                <div className="card-rating">
                                    <StarRating value={event.avgRating} />
                                    <span>{event.avgRating} ({event.reviewCount})</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <h2>Review Moderation ({reviews.length})</h2>
            {reviews.length === 0 ? (
                <p>No reviews to moderate.</p>
            ) : (
                <div className="admin-events-table-wrapper">
                    <table className="admin-events-table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Reviewer</th>
                                <th>Rating</th>
                                <th>Comment</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review) => (
                                <tr key={review._id}>
                                    <td>{review.event?.name || 'Deleted event'}</td>
                                    <td>{review.name}</td>
                                    <td><StarRating value={review.rating} /></td>
                                    <td className="admin-review-comment">{review.comment}</td>
                                    <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={() => handleDeleteReview(review._id)}
                                            disabled={deletingId === review._id}
                                        >
                                            {deletingId === review._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;
