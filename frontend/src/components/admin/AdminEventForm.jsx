import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LocationAutocomplete from '../shared/LocationAutocomplete.jsx';
import { CATEGORIES } from '../../lib/categories';
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
    price: '',
    advanceAmount: '',
};

// Handles both /admin/events/new (id is undefined — create) and
// /admin/events/:id/edit (id present — fetch, prefill, PUT).
const AdminEventForm = () => {
    const { isAuthenticated, isManager } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { id: editingId } = useParams();

    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(!!editingId);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!editingId) {
            setForm(emptyForm);
            return;
        }

        setLoading(true);
        api.get(`/events/${editingId}`)
            .then(({ data: event }) => {
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
                    price: event.price ?? '',
                    advanceAmount: event.advanceAmount ?? '',
                });
            })
            .catch(() => toast.error('Could not load that event.'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingId]);

    if (!isAuthenticated || !isManager) {
        return <Navigate to="/home" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((current) => ({ ...current, [name]: value }));
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
                navigate('/admin/events');
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

    return (
        <div>
            <Header />
            <section className="admin-section">
                <h1>{editingId ? 'Edit Event' : 'Add New Event'}</h1>
                <AdminNav />

                {loading ? (
                    <p>Loading event...</p>
                ) : (
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
                                    {CATEGORIES.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
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
                                <label className="form-label">Price (blank = contact for pricing)</label>
                                <input className="form-control" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Advance Payment (blank = no payment required to book)</label>
                                <input className="form-control" name="advanceAmount" type="number" min="0" step="0.01" value={form.advanceAmount} onChange={handleChange} />
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
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/events')}>
                                {editingId ? 'Cancel Edit' : 'Back to Events'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
};

export default AdminEventForm;
