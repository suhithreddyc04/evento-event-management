import { Fragment, useEffect, useState } from 'react';
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
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [flaggingId, setFlaggingId] = useState(null);
    const [reviewSort, setReviewSort] = useState('newest');
    const [flawsOnly, setFlawsOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replySaving, setReplySaving] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/admin/analytics'),
            api.get('/admin/reviews'),
            api.get('/admin/customers'),
        ])
            .then(([analyticsRes, reviewsRes, customersRes]) => {
                setStats(analyticsRes.data);
                setReviews(reviewsRes.data);
                setCustomers(customersRes.data);
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

    const handleToggleFlag = (review) => {
        setFlaggingId(review._id);
        api.patch(`/admin/reviews/${review._id}/flag`, { flagged: !review.flagged })
            .then(({ data }) => {
                setReviews((current) => current.map((r) => (r._id === data._id ? data : r)));
            })
            .catch(() => toast.error('Could not update review.'))
            .finally(() => setFlaggingId(null));
    };

    const openReplyForm = (review) => {
        setReplyingId(review._id);
        setReplyText(review.adminReply?.text || '');
    };

    const handleSaveReply = (reviewId) => {
        setReplySaving(true);
        api.post(`/admin/reviews/${reviewId}/reply`, { text: replyText })
            .then(({ data }) => {
                setReviews((current) => current.map((r) => (r._id === data._id ? data : r)));
                toast.success('Reply saved.');
                setReplyingId(null);
            })
            .catch(() => toast.error('Could not save reply.'))
            .finally(() => setReplySaving(false));
    };

    if (loading) {
        return <Skeleton count={4} />;
    }

    if (!stats) {
        return <p>Could not load analytics.</p>;
    }

    const maxCount = Math.max(1, ...stats.bookingsByDay.map((day) => day.count));

    const searchLower = searchTerm.trim().toLowerCase();
    const displayedReviews = reviews
        .filter((review) => !flawsOnly || review.rating <= 2)
        .filter((review) => {
            if (!searchLower) return true;
            return (
                review.comment?.toLowerCase().includes(searchLower) ||
                review.name?.toLowerCase().includes(searchLower) ||
                review.event?.name?.toLowerCase().includes(searchLower)
            );
        })
        .slice()
        .sort((a, b) => {
            if (reviewSort === 'rating-asc') return a.rating - b.rating;
            if (reviewSort === 'rating-desc') return b.rating - a.rating;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

    const ratingPoints = stats.ratingTrend.filter((point) => point.avgRating != null);
    const minTrend = ratingPoints.length ? Math.min(...ratingPoints.map((p) => p.avgRating)) : 0;
    const maxTrend = ratingPoints.length ? Math.max(...ratingPoints.map((p) => p.avgRating)) : 5;
    const trendRange = Math.max(maxTrend - minTrend, 0.5);

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

            <h2>Average Rating Trend</h2>
            {ratingPoints.length === 0 ? (
                <p>No reviews yet — nothing to trend.</p>
            ) : (
                <div className="admin-bar-chart" role="img" aria-label="Average rating trend over the last 14 days">
                    {stats.ratingTrend.map((day, index) => {
                        const heightPct = day.avgRating != null
                            ? Math.max(((day.avgRating - minTrend) / trendRange) * 90 + 10, 6)
                            : 0;
                        return (
                            <div className="admin-bar-column" key={day.date}>
                                <div
                                    className="admin-bar admin-bar-rating"
                                    style={{ height: `${heightPct}%` }}
                                    title={day.avgRating != null ? `${day.date}: ${day.avgRating} avg rating` : `${day.date}: no reviews yet`}
                                >
                                    {day.avgRating != null && <span className="admin-bar-value">{day.avgRating}</span>}
                                </div>
                                {index % 3 === 0 && <span className="admin-bar-label">{formatDayLabel(day.date)}</span>}
                            </div>
                        );
                    })}
                </div>
            )}

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

            <h2>Repeat Customers</h2>
            {customers.length === 0 ? (
                <p>No repeat customers yet.</p>
            ) : (
                <ol className="admin-top-rated-list">
                    {customers.map((customer) => (
                        <li key={customer._id} className="admin-top-rated-row">
                            <div className="admin-top-rated-info">
                                <span>{customer.name}</span>
                                <span className="admin-stat-label">{customer.email} · {customer.bookingCount} bookings</span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <div className="admin-reviews-header">
                <h2>Review Moderation ({displayedReviews.length}{displayedReviews.length !== reviews.length ? ` of ${reviews.length}` : ''})</h2>
                <div className="admin-reviews-controls">
                    <input
                        type="search"
                        className="form-control form-control-sm admin-review-search"
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-select form-select-sm"
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value)}
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="rating-asc">Sort: Rating (Low to High)</option>
                        <option value="rating-desc">Sort: Rating (High to Low)</option>
                    </select>
                    <label className="admin-flaws-toggle">
                        <input
                            type="checkbox"
                            checked={flawsOnly}
                            onChange={(e) => setFlawsOnly(e.target.checked)}
                        />
                        Find the flaws (1-2 star only)
                    </label>
                </div>
            </div>
            {reviews.length === 0 ? (
                <p>No reviews to moderate.</p>
            ) : displayedReviews.length === 0 ? (
                <p>No reviews match the current filters.</p>
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
                            {displayedReviews.map((review) => (
                                <Fragment key={review._id}>
                                    <tr className={review.rating <= 2 ? 'admin-review-flagged' : ''}>
                                        <td>{review.event?.name || 'Deleted event'}</td>
                                        <td>{review.name}</td>
                                        <td><StarRating value={review.rating} /></td>
                                        <td className="admin-review-comment">
                                            {review.comment}
                                            {review.flagged && <span className="admin-status-badge is-waitlisted admin-review-flag-badge">Flagged</span>}
                                            {review.adminReply?.text && (
                                                <p className="admin-review-reply-preview"><strong>Reply:</strong> {review.adminReply.text}</p>
                                            )}
                                        </td>
                                        <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                                        <td className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => handleToggleFlag(review)}
                                                disabled={flaggingId === review._id}
                                            >
                                                {review.flagged ? 'Unflag' : 'Flag'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => (replyingId === review._id ? setReplyingId(null) : openReplyForm(review))}
                                            >
                                                Reply
                                            </button>
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
                                    {replyingId === review._id && (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="admin-review-reply-form">
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows={2}
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Write a public reply to this review..."
                                                    />
                                                    <div className="admin-review-reply-actions">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleSaveReply(review._id)}
                                                            disabled={replySaving}
                                                        >
                                                            {replySaving ? 'Saving...' : 'Save Reply'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => setReplyingId(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;
