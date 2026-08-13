import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../layout/Header.jsx';
import AdminNav from './AdminNav.jsx';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Skeleton from '../shared/Skeleton.jsx';
import './admin.css';

// GET /admin/customers is admin-only server-side (platform-wide repeat-
// customer data isn't scoped per event, so it wouldn't make sense for a
// manager to see it) — gated to isAdmin here to match.
const AdminCustomers = () => {
    const { isAuthenticated, isAdmin } = useAuth();
    const toast = useToast();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) return;

        setLoading(true);
        api.get('/admin/customers')
            .then(response => setCustomers(response.data))
            .catch(() => toast.error('Could not load customers.'))
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
                <h1>Customers</h1>
                <AdminNav />

                <h2>Repeat Customers</h2>
                {loading ? (
                    <Skeleton count={4} />
                ) : customers.length === 0 ? (
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
            </section>
        </div>
    );
};

export default AdminCustomers;
