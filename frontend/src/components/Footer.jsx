import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

export default function Footer() {
    return (
        <footer className="footer-container">
            <div className="footer-content">
                <div className="footer-brand">
                    <div className="footer-brand-title">
                        <img src="/logo.jpg" alt="Evento" className="footer-logo" />
                        <span>Evento</span>
                    </div>
                    <p>
                        Your partner in unforgettable events — weddings, corporate gatherings,
                        birthdays, and reunions, planned and booked all in one place.
                    </p>
                    <div className="footer-social">
                        <a href="#" aria-label="Facebook"><i className="bi bi-facebook"></i></a>
                        <a href="#" aria-label="Instagram"><i className="bi bi-instagram"></i></a>
                        <a href="#" aria-label="Twitter"><i className="bi bi-twitter"></i></a>
                    </div>
                </div>

                <div className="footer-column">
                    <h4>Quick Links</h4>
                    <Link to="/home">Home</Link>
                    <Link to="/events">Events</Link>
                    <Link to="/about">About</Link>
                </div>

                <div className="footer-column">
                    <h4>Get in Touch</h4>
                    <span><i className="bi bi-envelope"></i> hello@evento.com</span>
                    <span><i className="bi bi-geo-alt"></i> Bengaluru, India</span>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2024 Evento. All rights reserved.</p>
            </div>
        </footer>
    );
}
