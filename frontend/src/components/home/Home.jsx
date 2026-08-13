import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './homepage.css';
import Header from '../layout/Header.jsx';
import { Reveal, StaggerGroup, StaggerItem } from '../shared/Reveal.jsx';
import { useAuth } from '../../context/AuthContext';

const features = [
    {
        icon: 'bi-stars',
        title: 'Tailored Experiences',
        text: 'Every event is planned around you — themes, venues, and details customized to your vision.',
    },
    {
        icon: 'bi-shield-check',
        title: 'Trusted & Reliable',
        text: 'From booking to the big day, our team handles every detail with care and professionalism.',
    },
    {
        icon: 'bi-wallet2',
        title: 'Transparent Pricing',
        text: 'No hidden surprises. Know exactly what you are getting before you book.',
    },
    {
        icon: 'bi-headset',
        title: 'Dedicated Support',
        text: 'Real people ready to help you plan, adjust, and perfect your event at every step.',
    },
];

const categoryPreviews = [
    { id: 'wedding', name: 'Weddings', imageUrl: '/images/m2.jpg', tagline: 'Say "I do" in style' },
    { id: 'corporate', name: 'Corporate Events', imageUrl: '/images/ce2.jpg', tagline: 'Impress your team & clients' },
    { id: 'birthday', name: 'Birthdays', imageUrl: '/images/b2.jpg', tagline: 'Celebrations they will remember' },
    { id: 'reunion', name: 'Reunions', imageUrl: '/images/g2.jpg', tagline: 'Bring everyone back together' },
];

const Home = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isManager } = useAuth();

    if (isAuthenticated && isManager) {
        return <Navigate to="/admin/events" replace />;
    }

    return (
        <div>
            <Header />

            <section className="hero-section">
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <span className="kicker">Event Planning, Perfected</span>
                    <h1 className="hero-headline">
                        Making every <em>moment</em><br />unforgettable
                    </h1>
                    <p className="hero-description">
                        From dream weddings to milestone birthdays and flawless corporate events —
                        Evento brings your vision to life with expert planning and impeccable execution.
                    </p>
                    <div className="hero-actions">
                        <motion.button
                            className="explore-button"
                            onClick={() => navigate('/events')}
                            whileHover={{ scale: 1.04, y: -3, boxShadow: '0 12px 32px rgba(245, 165, 36, 0.45)' }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        >
                            Explore Events
                        </motion.button>
                        <Link to="/about" className="hero-secondary-link">
                            Learn more <i className="bi bi-arrow-right"></i>
                        </Link>
                    </div>
                </motion.div>
                <motion.div
                    className="hero-gallery"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                >
                    <div className="hero-gallery-grid">
                        <img src="/images/b1.jpg" alt="Beautiful Event Setup" className="hero-img hero-img-1" />
                        <img src="/images/m1.jpg" alt="Memorable Moment" className="hero-img hero-img-2" />
                        <img src="/images/g1.jpg" alt="Reunion Event" className="hero-img hero-img-3" />
                        <img src="/images/b2.jpg" alt="Event Decor" className="hero-img hero-img-4" />
                    </div>
                </motion.div>
            </section>

            <div className="marquee-strip" aria-hidden="true">
                <div className="marquee-track">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div className="marquee-group" key={i}>
                            <span>Weddings</span>
                            <span className="marquee-dot">✦</span>
                            <span>Corporate Events</span>
                            <span className="marquee-dot">✦</span>
                            <span>Birthdays</span>
                            <span className="marquee-dot">✦</span>
                            <span>Reunions</span>
                            <span className="marquee-dot">✦</span>
                        </div>
                    ))}
                </div>
            </div>

            <section className="features-section">
                <Reveal className="section-heading">
                    <span className="kicker">Why Evento</span>
                    <h2>Everything you need for the perfect event</h2>
                </Reveal>
                <StaggerGroup className="features-grid">
                    {features.map((feature, index) => (
                        <StaggerItem key={feature.title} className="feature-card">
                            <span className="feature-index">{String(index + 1).padStart(2, '0')}</span>
                            <div className="feature-icon">
                                <i className={`bi ${feature.icon}`}></i>
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </StaggerItem>
                    ))}
                </StaggerGroup>
            </section>

            <section className="categories-preview-section">
                <Reveal className="section-heading">
                    <span className="kicker">Explore</span>
                    <h2>Find your perfect event type</h2>
                </Reveal>
                <StaggerGroup className="categories-preview-grid">
                    {categoryPreviews.map((category) => (
                        <StaggerItem key={category.id} className="category-preview-card">
                            <Link to={`/category/${category.id}`} className="category-preview-card-link">
                                <img src={category.imageUrl} alt={category.name} loading="lazy" />
                                <div className="category-preview-overlay">
                                    <h3>{category.name}</h3>
                                    <p>{category.tagline}</p>
                                    <span className="category-preview-cta">
                                        View Events <i className="bi bi-arrow-right"></i>
                                    </span>
                                </div>
                            </Link>
                        </StaggerItem>
                    ))}
                </StaggerGroup>
            </section>

            <Reveal className="cta-banner">
                <h2>Ready to start planning your event?</h2>
                <p>Browse our curated events and book the one that fits your celebration.</p>
                <motion.button
                    className="explore-button"
                    onClick={() => navigate('/events')}
                    whileHover={{ scale: 1.04, y: -3, boxShadow: '0 12px 32px rgba(245, 165, 36, 0.45)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                    Get Started
                </motion.button>
            </Reveal>
        </div>
    );
};

export default Home;
