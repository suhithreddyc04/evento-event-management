import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import './login.css';

const Register = () => {
    const [name, setName] = useState('');
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

        api.post('/register', { name, email, password })
            .then(() => {
                toast.success("Registered successfully! Please log in to proceed.");
                navigate('/login');
            })
            .catch(err => {
                if (err.response?.status === 400) {
                    toast.error("E-mail already registered! Please log in to proceed.");
                    navigate('/login');
                } else {
                    toast.error(err.response?.data?.message || 'An error occurred. Please try again later.');
                }
            })
            .finally(() => setSubmitting(false));
    }

    const handleGoogleSuccess = (credentialResponse) => {
        api.post('/auth/google', { credential: credentialResponse.credential })
            .then(result => {
                login(result.data.token);
                toast.success('Welcome to Evento!');
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
                            <li><i className="bi bi-check-circle-fill"></i> Book weddings, birthdays & more in minutes</li>
                            <li><i className="bi bi-check-circle-fill"></i> Track every booking in one place</li>
                            <li><i className="bi bi-check-circle-fill"></i> Save your favorite events for later</li>
                        </ul>

                        <div>
                            <h2>Start Planning Your Perfect Event</h2>
                            <p>Create an account to book, track, and manage every celebration with Evento.</p>
                        </div>
                    </div>
                </div>

                <div className="login-form-panel">
                    <h2 className="login-heading">Create Your Account</h2>
                    <p className="login-subheading">Join Evento and start planning your next celebration</p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label htmlFor="registerName">Full Name</label>
                            <div className="login-input-group">
                                <i className="bi bi-person login-input-icon"></i>
                                <input
                                    type="text"
                                    placeholder="Enter Name"
                                    id="registerName"
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="registerEmail">Email Id</label>
                            <div className="login-input-group">
                                <i className="bi bi-envelope login-input-icon"></i>
                                <input
                                    type="email"
                                    placeholder="Enter Email"
                                    id="registerEmail"
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="registerPassword">Password</label>
                            <div className="login-input-group">
                                <i className="bi bi-lock login-input-icon"></i>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter Password"
                                    id="registerPassword"
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

                        <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                            {submitting ? 'Registering...' : 'Register'}
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
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Register
