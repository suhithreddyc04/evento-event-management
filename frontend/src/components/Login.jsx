import { useState } from 'react';
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import './login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const toast = useToast();

    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmitting(true);

        api.post('/login', { email, password })
            .then(result => {
                if (result.data.message === "Login success") {
                    login(result.data.token);
                    toast.success('Welcome back!');
                    navigate('/home');
                } else {
                    toast.error('Incorrect password! Please try again.');
                }
            })
            .catch(err => {
                const message = err.response?.data?.message || 'An error occurred. Please try again later.';
                toast.error(message);
            })
            .finally(() => setSubmitting(false));
    }

    const handleGoogleSuccess = (credentialResponse) => {
        api.post('/auth/google', { credential: credentialResponse.credential })
            .then(result => {
                login(result.data.token);
                toast.success('Welcome back!');
                navigate('/home');
            })
            .catch(() => toast.error('Google sign-in failed. Please try again.'));
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-visual">
                    <div className="login-visual-overlay">
                        <Link to="/home" className="login-brand">
                            <img src="/logo.jpg" alt="Evento" className="login-brand-logo" />
                            <span>Evento</span>
                        </Link>

                        <ul className="login-feature-list">
                            <li><i className="bi bi-check-circle-fill"></i> Instant booking confirmations</li>
                            <li><i className="bi bi-check-circle-fill"></i> Track and manage all your events</li>
                            <li><i className="bi bi-check-circle-fill"></i> Trusted by 350+ happy clients</li>
                        </ul>

                        <div>
                            <h2>Your Partner In Unforgettable Events</h2>
                            <p>Sign in to manage your bookings and keep planning your next celebration.</p>
                        </div>
                    </div>
                </div>

                <div className="login-form-panel">
                    <h2 className="login-heading">Welcome Back</h2>
                    <p className="login-subheading">Log in to continue to your account</p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label htmlFor="loginEmail">Email Id</label>
                            <div className="login-input-group">
                                <i className="bi bi-envelope login-input-icon"></i>
                                <input
                                    type="email"
                                    placeholder="Enter Email"
                                    id="loginEmail"
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="loginPassword">Password</label>
                            <div className="login-input-group">
                                <i className="bi bi-lock login-input-icon"></i>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter Password"
                                    id="loginPassword"
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() => setShowPassword((show) => !show)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="login-forgot-row">
                            <Link to="/forgot-password">Forgot password?</Link>
                        </div>

                        <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                            {submitting ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="login-divider">
                        <span>or continue with</span>
                    </div>

                    <div className="login-google">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google sign-in failed.')}
                            shape="pill"
                            size="large"
                            width="340"
                        />
                    </div>

                    <p className="login-register-prompt">
                        Don&apos;t have an account? <Link to="/register">Register</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
