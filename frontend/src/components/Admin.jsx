import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from './header.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import AdminAnalytics from './AdminAnalytics.jsx';
import LocationAutocomplete from './LocationAutocomplete.jsx';
import './admin.css';

const emptyForm = {
    name: '',
    description: '',
    imageUrl: '',
    category: 'wedding',
    location: '',
    details: '',
    activities: '',
    decorations: '',
    games: '',
    capacity: '',
};

const Admin = () => {
    const { isAuthenticated, isAdmin } = useAuth();
    const toast = useToast();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('events');

    const loadEvents = () => {
        setLoading(true);
        api.get('/events', { params: { limit: 1000 } })
            .then(response => setEvents(response.data.events))
            .catch(() => toast.error('Could not load events.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isAuthenticated && isAdmin) loadEvents();
    }, [isAuthenticated, isAdmin]);

    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/home" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const startEdit = (event) => {
        setEditingId(event._id);
        setForm({
            name: event.name || '',
            description: event.description || '',
            imageUrl: event.imageUrl || '',
            category: event.category || 'wedding',
            location: event.location || '',
            details: event.details || '',
            activities: event.activities || '',
            decorations: event.decorations || '',
            games: event.games || '',
            capacity: event.capacity ?? '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);

        const request = editingId
            ? api.put(`/admin/events/${editingId}`, form)
            : api.post('/admin/events', form);

        request
            .then(() => {
                toast.success(editingId ? 'Event updated.' : 'Event created.');
                cancelEdit();
                loadEvents();
            })
            .catch(err => toast.error(err.response?.data?.message || 'Could not save event.'))
            .finally(() => setSubmitting(false));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('image', file);

        api.post('/admin/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(response => {
                setForm((current) => ({ ...current, imageUrl: response.data.imageUrl }));
                toast.success('Image uploaded.');
            })
            .catch(err => toast.error(err.response?.data?.message || 'Image upload failed.'))
            .finally(() => setUploading(false));
    };

    const handleDelete = (eventId) => {
        if (!window.confirm('Delete this event? This also removes any bookings for it.')) return;

        api.delete(`/admin/events/${eventId}`)
            .then(() => {
                toast.success('Event deleted.');
                if (editingId === eventId) cancelEdit();
                loadEvents();
            })
            .catch(() => toast.error('Could not delete event.'));
    };

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>Admin</h1>

                <div className="admin-tabs">
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Manage Events
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </button>
                </div>

                {activeTab === 'analytics' ? (
                    <AdminAnalytics />
                ) : (
                    <>
                <form onSubmit={handleSubmit} className="admin-form">
                    <h2>{editingId ? 'Edit Event' : 'Add New Event'}</h2>

                    <div className="admin-form-grid">
                        <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input className="form-control" name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Category</label>
                            <select className="form-select" name="category" value={form.category} onChange={handleChange} required>
                                <option value="wedding">Wedding</option>
                                <option value="corporate">Corporate</option>
                                <option value="birthday">Birthday</option>
                                <option value="reunion">Reunion</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Image</label>
                            <input
                                className="form-control mb-2"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                            {uploading && <p className="upload-status">Uploading...</p>}
                            <input
                                className="form-control"
                                name="imageUrl"
                                value={form.imageUrl}
                                onChange={handleChange}
                                placeholder="Or paste an image URL / path"
                                required
                            />
                            {form.imageUrl && (
                                <img src={form.imageUrl} alt="Preview" className="admin-image-preview" />
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Capacity (blank = unlimited)</label>
                            <input className="form-control" name="capacity" type="number" min="0" value={form.capacity} onChange={handleChange} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Location</label>
                            <LocationAutocomplete
                                value={form.location}
                                onChange={(value) => setForm((current) => ({ ...current, location: value }))}
                                placeholder="e.g. Taj Lands End, Mumbai"
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" name="description" value={form.description} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Details</label>
                        <textarea className="form-control" name="details" value={form.details} onChange={handleChange} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Activities</label>
                        <input className="form-control" name="activities" value={form.activities} onChange={handleChange} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Decorations</label>
                        <input className="form-control" name="decorations" value={form.decorations} onChange={handleChange} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Games</label>
                        <input className="form-control" name="games" value={form.games} onChange={handleChange} />
                    </div>

                    <div className="admin-form-actions">
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : editingId ? 'Update Event' : 'Add Event'}
                        </button>
                        {editingId && (
                            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>

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
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event._id}>
                                        <td>{event.name}</td>
                                        <td>{event.category}</td>
                                        <td>{event.capacity ?? 'Unlimited'}</td>
                                        <td className="admin-row-actions">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(event)}>Edit</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(event._id)}>Delete</button>
                                        </td>
                                    </tr>
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

export default Admin;
