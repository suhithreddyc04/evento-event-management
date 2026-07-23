import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from './header.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

const ChangePassword = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleSubmit = (event) => {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match.');
            return;
        }

        setSubmitting(true);

        api.put('/change-password', { currentPassword, newPassword })
            .then(() => {
                toast.success('Password changed successfully.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            })
            .catch(err => {
                toast.error(err.response?.data?.message || 'Could not change password. Please try again.');
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div>
            <Header />
            <div className="page-center">
                <div className="auth-card">
                    <h2 className='mb-3'>Change Password</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 text-start">
                            <label htmlFor="currentPassword" className="form-label">
                                <strong>Current Password</strong>
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                className="form-control"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3 text-start">
                            <label htmlFor="newPassword" className="form-label">
                                <strong>New Password</strong>
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                className="form-control"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="mb-3 text-start">
                            <label htmlFor="confirmPassword" className="form-label">
                                <strong>Confirm New Password</strong>
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="form-control"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
