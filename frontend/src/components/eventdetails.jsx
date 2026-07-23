import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './eventdetails.css';
import Header from './header.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import Skeleton from './Skeleton.jsx';
import { getCategoryFields, getNameLabel } from '../bookingFields';

const EventDetails = () => {
  const { eventId } = useParams();
  const { isAuthenticated, email } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    date: '',
  });
  const [details, setDetails] = useState({});
  const [specialRequests, setSpecialRequests] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setFormData({ name: '', address: '', date: '' });
    setDetails({});
    setSpecialRequests('');
    setFormSubmitted(false);
    setBookingError(null);

    api.get(`/events/${eventId}`)
      .then(response => setEvent(response.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDetailChange = (name, value) => {
    setDetails((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBookingError(null);

    api.post('/bookings', { eventId, ...formData, details, specialRequests })
      .then(() => {
        setFormSubmitted(true);
        setEvent((current) => ({ ...current, bookedCount: (current.bookedCount || 0) + 1 }));
        toast.success('Booking confirmed! We will contact you soon.');
      })
      .catch(err => {
        let message = 'Could not submit your booking. Please try again.';
        if (err.response?.status === 401) message = 'Please log in to book this event.';
        if (err.response?.status === 409) message = err.response?.data?.message || "You've already booked this event.";
        setBookingError(message);
        toast.error(message);
      })
      .finally(() => setSubmitting(false));
  };

  const isSoldOut = event && event.capacity != null && event.bookedCount >= event.capacity;

  if (loading) {
    return (
      <>
        <Header />
        <div className="event-details">
          <Skeleton count={1} />
        </div>
      </>
    );
  }

  if (notFound || !event) {
    return (
      <>
        <Header />
        <p>Event not found.</p>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="event-details">
        <h1>{event.name}</h1>
        <img src={event.imageUrl} alt={event.name} className="event-image" />
        <p>{event.description}</p>
        <h3>Details: {event.details}</h3>
        <h3><strong>Category:</strong> {event.category.charAt(0).toUpperCase() + event.category.slice(1)}</h3>

        <div className="event-activities">
          <h3>Activities:</h3>
          <p>{event.activities}</p>
        </div>

        <div className="event-decorations">
          <h3>Decorations:</h3>
          <p>{event.decorations}</p>
        </div>

        <div className="event-games">
          <h3>Games:</h3>
          <p>{event.games}</p>
        </div>

        <Link to={`/category/${event.category}`} className="back-link">
          Back to {event.category.charAt(0).toUpperCase() + event.category.slice(1)} Events
        </Link>

        <div className="book-form-container">
          <h3>Book This Event</h3>

          {event.capacity != null && (
            <p className="capacity-note">
              {isSoldOut
                ? 'This event is fully booked.'
                : `${event.capacity - event.bookedCount} of ${event.capacity} spots left`}
            </p>
          )}

          {!isAuthenticated ? (
            <p>
              Please <Link to="/login">log in</Link> (or{' '}
              <Link to="/register">create an account</Link>) to book this event.
            </p>
          ) : formSubmitted ? (
            <p>Thank you for booking! We will contact you soon.</p>
          ) : isSoldOut ? (
            <p>Sorry, this event has no spots left.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="booking-as">Booking as <strong>{email}</strong></p>

              <div className="form-group">
                <label htmlFor="name">{getNameLabel(event.category)}:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address:</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  placeholder="Venue or contact address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">Event Date:</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {getCategoryFields(event.category).map((field) => (
                <div className="form-group" key={field.name}>
                  <label htmlFor={field.name}>{field.label}:</label>
                  {field.type === 'select' ? (
                    <select
                      id={field.name}
                      className="form-select"
                      value={details[field.name] || ''}
                      onChange={(e) => handleDetailChange(field.name, e.target.value)}
                    >
                      <option value="">Select...</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      min={field.type === 'number' ? 0 : undefined}
                      value={details[field.name] || ''}
                      onChange={(e) => handleDetailChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="form-group">
                <label htmlFor="specialRequests">Anything else? (custom requests, special requirements):</label>
                <textarea
                  id="specialRequests"
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Tell us about any custom requirements for your event..."
                />
              </div>

              {bookingError && <p className="booking-error">{bookingError}</p>}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Booking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default EventDetails;
