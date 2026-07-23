import React from 'react';
import Header from './header.jsx';
import './about.css';

const About = () => {
  const reviews = [
    {
      name: "Alice Johnson",
      feedback: "Amazing service! The team made our wedding day stress-free and beautiful.",
      rating: 5,
    },
    {
      name: "Mark Peterson",
      feedback: "Very professional. The corporate conference was organized perfectly.",
      rating: 4,
    },
    {
      name: "Sophia Lee",
      feedback: "Highly recommend them for any event! Our family reunion was unforgettable.",
      rating: 5,
    },
  ];

  return (
    <>
      <Header />
      <div className="about-hero">
        <div className="about-hero-overlay">
          <h1>About Us</h1>
          <p>
            Welcome to <strong>Evento</strong>, your event management platform! We specialize in organizing
            and managing memorable events tailored to your needs. From personal
            celebrations like birthdays and weddings to professional gatherings
            like corporate conferences and reunions, we ensure a seamless experience.
          </p>
          <p>
            Our team of experts takes care of every detail, so you can relax and
            enjoy your special moments while we handle the logistics. Let us make
            your event unforgettable!
          </p>
        </div>
      </div>

      <section className="reviews-section">
        <h2>Customer Reviews</h2>
        <div className="review-container">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <h3>{review.name}</h3>
              <p>{review.feedback}</p>
              <p className="review-rating">{"⭐".repeat(review.rating)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default About;
