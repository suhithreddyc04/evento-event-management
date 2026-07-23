import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../ToastContext';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const toast = useToast();

    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmitting(true);

        api.post('/forgot-password', { email })
            .then(() => {
                setSent(true);
                toast.success('If that email is registered, a reset link has been sent.');
            })
            .catch(err => {
                toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className='mb-3'>Forgot Password</h2>
                {sent ? (
                    <p>Check your inbox for a link to reset your password.</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 text-start">
                            <label htmlFor="email" className="form-label">
                                <strong>Email Id</strong>
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="Enter your registered email"
                                className="form-control"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
                <p className='container my-2'>
                    <Link to='/login'>Back to Login</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
