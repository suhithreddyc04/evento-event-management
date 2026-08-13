import { Fragment, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Skeleton from '../shared/Skeleton.jsx';
import StarRating from '../shared/StarRating.jsx';
import './admin.css';

// GET /admin/reviews is manager-scoped server-side (a manager only ever gets
// reviews for their own events, an admin gets everything) — no isAdmin gate
// needed here, unlike Analytics/Customers which are admin-only endpoints.
const AdminReviews = () => {
    const { isAuthenticated, isManager } = useAuth();
    const toast = useToast();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [flaggingId, setFlaggingId] = useState(null);
    const [reviewSort, setReviewSort] = useState('newest');
    const [flawsOnly, setFlawsOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replySaving, setReplySaving] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !isManager) return;

        setLoading(true);
        api.get('/admin/reviews')
            .then(response => setReviews(response.data))
            .catch(() => toast.error('Could not load reviews.'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isManager]);

    if (!isAuthenticated || !isManager) {
        return <Navigate to="/home" replace />;
    }

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

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>Reviews</h1>
                <AdminNav />

                {loading ? (
                    <Skeleton count={4} />
                ) : (
                    <>
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
                    </>
                )}
            </section>
        </div>
    );
};

export default AdminReviews;
