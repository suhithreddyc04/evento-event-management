import { useState } from 'react';
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
        <div className="auth-page">
            <div className="auth-card">
                <h2 className='mb-3'>Create Your Account</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 text-start">
                            <label htmlFor="exampleInputEmail1" className="form-label">
                                <strong >Name</strong>
                            </label>
                            <input 
                                type="text"
                                placeholder="Enter Name"
                                className="form-control" 
                                id="exampleInputname" 
                                onChange={(event) => setName(event.target.value)}
                                required
                            /> 
                        </div>
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
                            {submitting ? 'Registering...' : 'Register'}
                        </button>
                    </form>

                    <div className="d-flex justify-content-center my-3">
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error('Google sign-in failed.')} />
                    </div>

                <p className='container my-2'>Already have an account ?</p>
                <Link to='/login' className="btn btn-secondary">Login</Link>
            </div>
        </div>
    )
}

export default Register