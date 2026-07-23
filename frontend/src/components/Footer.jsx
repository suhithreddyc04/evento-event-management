import React from 'react';
import './footer.css'; // Import the external CSS file

export default function Footer() {
    return (
        <div className="footer-container">
            <div className="footer-text">
                <h5>© 2024 All rights have been reserved</h5>
            </div>

            <div className="footer-socials">
                <a href="https://www.linkedin.com/in/akshata-ganbote-7a3847247/" target="_blank" rel="noreferrer">
                    <i className="bi bi-linkedin mx-2 footer-icon"></i>
                </a>
                <a href="https://akshata-ganbote.netlify.app/" target="_blank" rel="noreferrer">
                    <i className="bi bi-globe mx-2 footer-icon"></i>
                </a>
                <a href="https://github.com/suhithreddyc" target="_blank" rel="noreferrer">
                    <i className="bi bi-github mx-2 footer-icon"></i>
                </a>
                <a href="mailto:suhithreddyc@gmail.com" target="_blank" rel="noreferrer">
                    <i className="bi bi-envelope-fill mx-2 footer-icon"></i>
                </a>
            </div>
        </div>
    );
}
