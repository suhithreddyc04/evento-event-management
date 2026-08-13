import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Skeleton from '../shared/Skeleton.jsx';
import StarRating from '../shared/StarRating.jsx';
import './admin.css';

const formatDayLabel = (isoDate) => {
    const [, month, day] = isoDate.split('-');
    return `${month}/${day}`;
};

// GET /admin/analytics is admin-only server-side (platform-wide totals
// aren't scoped per manager), so this page is gated to isAdmin, not just
// isManager.
const AdminAnalytics = () => {
    const { isAuthenticated, isAdmin } = useAuth();
    const toast = useToast();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) return;

        setLoading(true);
        api.get('/admin/analytics')
            .then(({ data }) => setStats(data))
            .catch((err) => {
                console.error('Analytics load failed:', err.response?.status, err.response?.data || err.message);
                toast.error(err.response?.data?.message || `Could not load analytics (${err.response?.status || 'network error'}).`);
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isAdmin]);

    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/home" replace />;
    }

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>Analytics</h1>
                <AdminNav />

                {loading ? (
                    <Skeleton count={4} />
                ) : !stats ? (
                    <p>Could not load analytics.</p>
                ) : (
                    <AnalyticsBody stats={stats} />
                )}
            </section>
        </div>
    );
};

const AnalyticsBody = ({ stats }) => {
    const maxCount = Math.max(1, ...stats.bookingsByDay.map((day) => day.count));
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
        </div>
    );
};

export default AdminAnalytics;
