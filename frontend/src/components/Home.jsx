import React from 'react';
import { useNavigate } from 'react-router-dom';
import './homepage.css';
import Header from './header.jsx';

const Home = () => {
    const navigate = useNavigate();

    const handleExploreClick = () => {
        navigate('/events'); // Navigate to the events page
    };

    return (
        <div>
            <Header />
            <section className="box-section">
                <div className="content">
                    <h1>
                        Welcome To <span className="highlight">Evento</span>!!!<br />
                        Your Partner In Unforgettable Events
                    </h1>
                    <div className="image-gallery">
                        <img src="/images/b1.jpg" alt="Beautiful Event Setup 1" className="event-image" />
                        <img src="/images/b2.jpg" alt="Beautiful Event Setup 2" className="event-image" />
                        <img src="/images/m1.jpg" alt="Memorable Moments 1" className="event-image" />
                        <img src="/images/m2.jpg" alt="Memorable Moments 2" className="event-image" />
                        <img src="/images/g1.jpg" alt="Reunion Event 1" className="event-image" />
                        <img src="/images/g2.jpg" alt="Reunion Event 2" className="event-image" />
                    </div>
                </div>
                <p className="description">
                    At <strong>Evento</strong>, we specialize in creating unforgettable memories by organizing and managing all kinds of events with perfection and passion. Whether it's a joyful <em>birthday celebration</em>, a dreamy <em>wedding ceremony</em>, or a heartwarming <em>get-together party</em>, we ensure every moment is as special as you imagined.
                </p>
                <div className="explore">
                    <button className="explore-button" onClick={handleExploreClick}>
                        Explore Now
                    </button>
                </div>
            </section>
        </div>
    );
};

export default Home;
