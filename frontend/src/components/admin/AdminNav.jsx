import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const tabClass = ({ isActive }) => `admin-tab-button ${isActive ? 'active' : ''}`;

// Shared top nav rendered by every /admin/* page — each section now lives on
// its own route instead of being a client-side tab switch, so this is what
// ties them together visually and lets the browser back button, refresh,
// and direct links (e.g. bookmarking /admin/reviews) all work normally.
const AdminNav = () => {
    const { isAdmin } = useAuth();

    return (
        <nav className="admin-tabs">
            <NavLink to="/admin/events" end className={tabClass}>Manage Events</NavLink>
            {isAdmin && (
                <NavLink to="/admin/events/new" className={tabClass}>Add New Event</NavLink>
            )}
            <NavLink to="/admin/bookings" className={tabClass}>Bookings</NavLink>
            <NavLink to="/admin/reviews" className={tabClass}>Reviews</NavLink>
            {isAdmin && (
                <>
                    <NavLink to="/admin/analytics" className={tabClass}>Analytics</NavLink>
                    <NavLink to="/admin/customers" className={tabClass}>Customers</NavLink>
                </>
            )}
        </nav>
    );
};

export default AdminNav;
