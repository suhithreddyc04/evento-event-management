import { useState } from 'react';
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
        <div className="auth-page">
            <div className="auth-card">
                <h2 className='mb-3'>Welcome Back</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 text-start">
                            <label htmlFor="exampleInputEmail1" className="form-label">
                                <strong>Email Id</strong>
                            </label>
                            <input
                                type="email"
                                placeholder="Enter Email"
                                className="form-control"
                                id="exampleInputEmail1"
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3 text-start">
                            <label htmlFor="exampleInputPassword1" className="form-label">
                                <strong>Password</strong>
                            </label>
                            <input
                                type="password"
                                placeholder="Enter Password"
                                className="form-control"
                                id="exampleInputPassword1"
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <div className="d-flex justify-content-center my-3">
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error('Google sign-in failed.')} />
                    </div>
                    <p className='container my-2'>
                        <Link to='/forgot-password'>Forgot password?</Link>
                    </p>
                <p className='container my-2'>Don&apos;t have an account?</p>
                <Link to='/register' className="btn btn-secondary">Register</Link>
            </div>
        </div>
    )
}

export default Login