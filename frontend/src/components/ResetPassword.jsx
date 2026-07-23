import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useToast } from '../ToastContext';

const ResetPassword = () => {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    const handleSubmit = (event) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setSubmitting(true);

        api.post(`/reset-password/${token}`, { password })
            .then(() => {
                toast.success('Password reset successfully! Please log in.');
                navigate('/login');
            })
            .catch(err => {
                toast.error(err.response?.data?.message || 'Could not reset password. Please try again.');
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className='mb-3'>Reset Password</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3 text-start">
                        <label htmlFor="password" className="form-label">
                            <strong>New Password</strong>
                        </label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Enter new password"
                            className="form-control"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="mb-3 text-start">
                        <label htmlFor="confirmPassword" className="form-label">
                            <strong>Confirm Password</strong>
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder="Confirm new password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
                <p className='container my-2'>
                    <Link to='/login'>Back to Login</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
