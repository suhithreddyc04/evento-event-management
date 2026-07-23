import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './homepage.css';
import Header from './header.jsx';

const stats = [
    { value: '500+', label: 'Events Hosted' },
    { value: '350+', label: 'Happy Clients' },
    { value: '12+', label: 'Cities Covered' },
    { value: '6', label: 'Years of Experience' },
];

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

const testimonials = [
    {
        quote: "Evento turned our wedding into something out of a dream. Every detail was handled beautifully.",
        name: 'Ananya & Rohit',
        role: 'Wedding, Bangalore',
    },
    {
        quote: "Our annual conference ran flawlessly. The team anticipated problems before they even happened.",
        name: 'Karthik Rao',
        role: 'Corporate Event, Hyderabad',
    },
    {
        quote: "Booking was so easy and the decorations for my daughter's birthday were beyond what we imagined.",
        name: 'Priya Sharma',
        role: 'Birthday, Chennai',
    },
];

const Home = () => {
    const navigate = useNavigate();

    return (
        <div>
            <Header />

            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-eyebrow">Event Planning, Perfected</span>
                    <h1>
                        Making Every <span className="highlight">Moment</span> Unforgettable
                    </h1>
                    <p className="hero-description">
                        From dream weddings to milestone birthdays and flawless corporate events —
                        Evento brings your vision to life with expert planning and impeccable execution.
                    </p>
                    <div className="hero-actions">
                        <button className="explore-button" onClick={() => navigate('/events')}>
                            Explore Events
                        </button>
                        <Link to="/about" className="hero-secondary-link">
                            Learn more <i className="bi bi-arrow-right"></i>
                        </Link>
                    </div>
                </div>
                <div className="hero-gallery">
                    <div className="hero-gallery-grid">
                        <img src="/images/b1.jpg" alt="Beautiful Event Setup" className="hero-img hero-img-1" />
                        <img src="/images/m1.jpg" alt="Memorable Moment" className="hero-img hero-img-2" />
                        <img src="/images/g1.jpg" alt="Reunion Event" className="hero-img hero-img-3" />
                        <img src="/images/b2.jpg" alt="Event Decor" className="hero-img hero-img-4" />
                    </div>
                </div>
            </section>

            <section className="stats-section">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-item">
                        <span className="stat-value">{stat.value}</span>
                        <span className="stat-label">{stat.label}</span>
                    </div>
                ))}
            </section>

            <section className="features-section">
                <div className="section-heading">
                    <span className="section-eyebrow">Why Evento</span>
                    <h2>Everything you need for the perfect event</h2>
                </div>
                <div className="features-grid">
                    {features.map((feature) => (
                        <div key={feature.title} className="feature-card">
                            <div className="feature-icon">
                                <i className={`bi ${feature.icon}`}></i>
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="categories-preview-section">
                <div className="section-heading">
                    <span className="section-eyebrow">Explore</span>
                    <h2>Find your perfect event type</h2>
                </div>
                <div className="categories-preview-grid">
                    {categoryPreviews.map((category) => (
                        <Link to={`/category/${category.id}`} key={category.id} className="category-preview-card">
                            <img src={category.imageUrl} alt={category.name} loading="lazy" />
                            <div className="category-preview-overlay">
                                <h3>{category.name}</h3>
                                <p>{category.tagline}</p>
                                <span className="category-preview-cta">
                                    View Events <i className="bi bi-arrow-right"></i>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="testimonials-section">
                <div className="section-heading">
                    <span className="section-eyebrow">Testimonials</span>
                    <h2>Loved by the people we've celebrated with</h2>
                </div>
                <div className="testimonials-grid">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.name} className="testimonial-card">
                            <i className="bi bi-quote testimonial-quote-icon"></i>
                            <p className="testimonial-quote">{testimonial.quote}</p>
                            <div className="testimonial-author">
                                <span className="testimonial-name">{testimonial.name}</span>
                                <span className="testimonial-role">{testimonial.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="cta-banner">
                <h2>Ready to start planning your event?</h2>
                <p>Browse our curated events and book the one that fits your celebration.</p>
                <button className="explore-button" onClick={() => navigate('/events')}>
                    Get Started
                </button>
            </section>
        </div>
    );
};

export default Home;
