import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './header.css';

const Header = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isAdmin, logout } = useAuth();

    const handleLogOutClick = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="header">
            <div className="header-left">
                <img src="/logo.jpg" alt="Logo" className="header-logo" />
                <h1 className="header-title">Evento</h1>
            </div>
            <div className="header-right">
                <Link to="/home" className="header-link">Home</Link>
                <Link to="/about" className="header-link">About</Link>

                {isAuthenticated ? (
                    <>
                        <Link to="/my-bookings" className="header-link">My Bookings</Link>
                        <Link to="/change-password" className="header-link">Change Password</Link>
                        {isAdmin && <Link to="/admin" className="header-link">Admin</Link>}
                        <button className="header-button" onClick={handleLogOutClick}>Log Out</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="header-link">Login</Link>
                        <Link to="/register" className="header-link">Register</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default Header;
