import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isAdmin, isManager, hasPassword, avatarUrl, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const landingPath = isManager ? '/admin' : '/home';
    const isHome = location.pathname === landingPath;

    const handleBackClick = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(landingPath);
        }
    };

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
                {!isHome && (
                    <button
                        type="button"
                        className="header-back-button"
                        onClick={handleBackClick}
                        aria-label="Go back"
                    >
                        <i className="bi bi-arrow-left"></i>
                    </button>
                )}
                <Link to={landingPath} className="header-logo-link">
                    <img src="/logo.jpg" alt="Logo" className="header-logo" />
                    <h1 className="header-title">Evento</h1>
                </Link>
            </div>
            <div className="header-right">
                <button
                    type="button"
                    className="header-theme-toggle"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
                </button>

                {!(isAuthenticated && isManager) && <Link to="/home" className="header-link">Home</Link>}

                {isAuthenticated && isManager ? (
                    <>
                        <Link to="/admin" className="header-link">{isAdmin ? 'Admin' : 'Manage Events'}</Link>
                        <button className="header-button" onClick={handleLogOutClick}>Log Out</button>
                    </>
                ) : isAuthenticated ? (
                    <>
                        <Link to="/about" className="header-link">About</Link>
                        <Link to="/my-bookings" className="header-link">My Bookings</Link>
                        <Link to="/favorites" className="header-link">Favorites</Link>

                        <div className="header-profile" ref={profileRef}>
                            <motion.button
                                type="button"
                                className="header-profile-toggle"
                                onClick={() => setProfileOpen((open) => !open)}
                                aria-haspopup="true"
                                aria-expanded={profileOpen}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="header-avatar" />
                                ) : (
                                    <i className="bi bi-person-circle"></i>
                                )}
                            </motion.button>
                            <AnimatePresence>
                                {profileOpen && (
                                    <motion.div
                                        className="header-profile-menu"
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                    >
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
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
