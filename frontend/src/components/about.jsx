import React from 'react';
import Header from './header.jsx';
import { Reveal, StaggerGroup, StaggerItem } from './Reveal.jsx';
import { CATEGORIES } from '../categories';
import './about.css';

const CATEGORY_ICONS = {
  wedding: 'bi-heart-fill',
  corporate: 'bi-briefcase-fill',
  birthday: 'bi-balloon-heart-fill',
  reunion: 'bi-people-fill',
};

const steps = [
  {
    icon: 'bi-search',
    title: 'Browse',
    text: 'Explore curated events by category, filter by rating, and find the one that matches your vision.',
  },
  {
    icon: 'bi-calendar-check',
    title: 'Book',
    text: 'Reserve your date in a few clicks, share your preferences, and pay securely when required.',
  },
  {
    icon: 'bi-stars',
    title: 'Celebrate',
    text: 'Our team handles the details on the day — you just show up and enjoy the moment.',
  },
];

const About = () => {
  return (
    <>
      <Header />
      <div className="about-hero">
        <Reveal className="about-hero-overlay">
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
        </Reveal>
      </div>

      <section className="offer-section">
        <Reveal className="section-heading">
          <span className="section-eyebrow">What We Offer</span>
          <h2>An event for every occasion</h2>
        </Reveal>
        <StaggerGroup className="offer-grid">
          {CATEGORIES.map((category) => (
            <StaggerItem key={category.id} className="offer-card">
              <div className="offer-icon">
                <i className={`bi ${CATEGORY_ICONS[category.id] || 'bi-stars'}`}></i>
              </div>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section className="steps-section">
        <Reveal className="section-heading">
          <span className="section-eyebrow">How Evento Works</span>
          <h2>From browsing to celebrating, in three steps</h2>
        </Reveal>
        <StaggerGroup className="steps-grid">
          {steps.map((step, index) => (
            <StaggerItem key={step.title} className="step-card">
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">
                <i className={`bi ${step.icon}`}></i>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>
    </>
  );
};

export default About;
