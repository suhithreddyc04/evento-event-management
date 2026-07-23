import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './header.css';

const Header = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isAdmin, hasPassword, logout } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

                {isAuthenticated && isAdmin ? (
                    <>
                        <Link to="/admin" className="header-link">Admin</Link>
                        <button className="header-button" onClick={handleLogOutClick}>Log Out</button>
                    </>
                ) : isAuthenticated ? (
                    <>
                        <Link to="/about" className="header-link">About</Link>
                        <Link to="/my-bookings" className="header-link">My Bookings</Link>
                        <Link to="/favorites" className="header-link">Favorites</Link>

                        <div className="header-profile" ref={profileRef}>
                            <button
                                type="button"
                                className="header-profile-toggle"
                                onClick={() => setProfileOpen((open) => !open)}
                                aria-haspopup="true"
                                aria-expanded={profileOpen}
                            >
                                <i className="bi bi-person-circle"></i>
                            </button>
                            {profileOpen && (
                                <div className="header-profile-menu">
                                    <Link
                                        to="/profile"
                                        className="header-profile-item"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        Profile
                                    </Link>
                                    {hasPassword && (
                                        <Link
                                            to="/change-password"
                                            className="header-profile-item"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Change Password
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        className="header-profile-item"
                                        onClick={handleLogOutClick}
                                    >
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <Link to="/about" className="header-link">About</Link>
                        <Link to="/login" className="header-link">Login</Link>
                        <Link to="/register" className="header-link">Register</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default Header;
