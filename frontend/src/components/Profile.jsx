import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from './header.jsx';
import Skeleton from './Skeleton.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import './profile.css';

const Profile = () => {
    const { isAuthenticated, login } = useAuth();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        api.get('/profile')
            .then(response => {
                setName(response.data.name || '');
                setEmail(response.data.email || '');
                setAvatarUrl(response.data.avatarUrl);
            })
            .catch(() => toast.error('Could not load profile.'))
            .finally(() => setLoading(false));

        api.get('/bookings/mine')
            .then(response => setBookings(response.data))
            .catch(() => setBookings([]))
            .finally(() => setBookingsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('avatar', file);

        api.post('/profile/avatar', data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(response => {
                setAvatarUrl(response.data.avatarUrl);
                toast.success('Avatar updated.');
            })
            .catch(err => toast.error(err.response?.data?.message || 'Avatar upload failed.'))
            .finally(() => setUploading(false));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        api.put('/profile', { name, email })
            .then(response => {
                login(response.data.token);
                toast.success('Profile updated.');
            })
            .catch(err => toast.error(err.response?.data?.message || 'Could not update profile.'))
            .finally(() => setSaving(false));
    };

    return (
        <div>
            <Header />
            <section className="profile-section">
                <h1>My Profile</h1>

                {loading ? (
                    <Skeleton count={2} />
                ) : (
                    <div className="page-center">
                        <div className="auth-card profile-card">
                            <div className="profile-avatar-block">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="profile-avatar" />
                                ) : (
                                    <div className="profile-avatar profile-avatar-placeholder">
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                )}
                                <label className="profile-avatar-upload">
                                    {uploading ? 'Uploading...' : 'Change photo'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        disabled={uploading}
                                        hidden
                                    />
                                </label>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3 text-start">
                                    <label htmlFor="name" className="form-label">
                                        <strong>Name</strong>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        className="form-control"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-3 text-start">
                                    <label htmlFor="email" className="form-label">
                                        <strong>Email</strong>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="profile-bookings">
                    <div className="profile-bookings-header">
                        <h2>Booking History</h2>
                        <Link to="/my-bookings">View all</Link>
                    </div>

                    {bookingsLoading ? (
                        <Skeleton count={2} />
                    ) : bookings.length === 0 ? (
                        <p>
                            You haven't booked any events yet. <Link to="/events">Browse events</Link> to get started.
                        </p>
                    ) : (
                        <div className="profile-bookings-list">
                            {bookings.slice(0, 5).map((booking) => (
                                <div key={booking._id} className="profile-booking-row">
                                    {booking.event?.imageUrl && (
                                        <img
                                            src={booking.event.imageUrl}
                                            alt={booking.event.name}
                                            className="profile-booking-image"
                                            loading="lazy"
                                        />
                                    )}
                                    <div>
                                        <h3>{booking.event?.name || 'Event no longer available'}</h3>
                                        <p>{new Date(booking.date).toLocaleDateString()}</p>
                                    </div>
                                    {booking.event && (
                                        <Link to={`/events/${booking.event._id}`} className="event-details-link">
                                            View Event
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Profile;
