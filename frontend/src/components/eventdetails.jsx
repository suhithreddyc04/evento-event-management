import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import './eventdetails.css';
import Header from './header.jsx';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import Skeleton from './Skeleton.jsx';
import StarRating from './StarRating.jsx';
import FavoriteButton from './FavoriteButton.jsx';
import EventMap from './EventMap.jsx';
import LocationAutocomplete from './LocationAutocomplete.jsx';
import { AnimatedDatePicker, AnimatedTimePicker } from './DateTimePicker.jsx';
import { getCategoryFields, getNameLabel } from '../bookingFields';
import { payForBooking } from '../payment';
import { Reveal, StaggerGroup, StaggerItem } from './Reveal.jsx';

const EventDetails = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const { isAuthenticated, email, userId, isAdmin } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    date: '',
    time: '',
  });
  const [details, setDetails] = useState({});
  const [specialRequests, setSpecialRequests] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setFormData({ name: '', phone: '', address: '', date: '', time: '' });
    setDetails({});
    setSpecialRequests('');
    setFormSubmitted(false);
    setBookingError(null);
    setReviewRating(0);
    setReviewComment('');

    api.get(`/events/${eventId}`)
      .then(response => setEvent(response.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    loadReviews();
  }, [eventId]);

  useEffect(() => {
    if (loading || location.hash !== '#reviews') return;
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
  }, [loading, location.hash]);

  const loadReviews = () => {
    setReviewsLoading(true);
    api.get(`/events/${eventId}/reviews`)
      .then(response => {
        setReviews(response.data);
        const existing = response.data.find((review) => review.user === userId);
        if (existing) {
          setReviewRating(existing.rating);
          setReviewComment(existing.comment);
        }
      })
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  };

  const myReview = reviews.find((review) => review.user === userId);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewRating) {
      toast.error('Please select a star rating.');
      return;
    }

    setReviewSubmitting(true);
    api.post(`/events/${eventId}/reviews`, { rating: reviewRating, comment: reviewComment })
      .then(() => {
        toast.success(myReview ? 'Review updated!' : 'Thanks for your review!');
        loadReviews();
      })
      .catch(err => {
        const message = err.response?.data?.message || 'Could not submit your review. Please try again.';
        toast.error(message);
      })
      .finally(() => setReviewSubmitting(false));
  };

  const handleReviewDelete = (reviewId) => {
    api.delete(`/reviews/${reviewId}`)
      .then(() => {
        toast.success('Review deleted.');
        loadReviews();
      })
      .catch(() => toast.error('Could not delete review. Please try again.'));
  };

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

    const { name, phone, address, date, time } = formData;
    if (!address.trim()) {
      const message = 'Please enter a venue address.';
      setBookingError(message);
      toast.error(message);
      return;
    }
    if (!date || !time) {
      const message = 'Please select both an event date and time.';
      setBookingError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    const combinedDate = `${date}T${time}`;

    api.post('/bookings', { eventId, name, phone, address, date: combinedDate, details, specialRequests })
      .then(response => {
        const booking = response.data;

        if (booking.status === 'pending_payment') {
          payForBooking(booking, {
            onSuccess: () => {
              setFormSubmitted(true);
              setBookingStatus('confirmed');
              setEvent((current) => ({ ...current, bookedCount: (current.bookedCount || 0) + 1 }));
              toast.success('Payment received! Your booking is confirmed.');
              setSubmitting(false);
            },
            onDismiss: () => {
              setFormSubmitted(true);
              setBookingStatus('pending_payment');
              toast.success("Booking held — complete payment from My Bookings to confirm your spot.");
              setSubmitting(false);
            },
            onError: () => {
              setFormSubmitted(true);
              setBookingStatus('pending_payment');
              toast.error('Payment could not be processed. You can retry from My Bookings.');
              setSubmitting(false);
            },
          });
          return;
        }

        setFormSubmitted(true);
        setBookingStatus(booking.status);
        if (booking.status === 'confirmed') {
          setEvent((current) => ({ ...current, bookedCount: (current.bookedCount || 0) + 1 }));
          toast.success('Thank you! Your booking is confirmed — we will contact you soon.');
        } else {
          toast.success("Thank you! This event is at capacity, so you've been added to the waiting list.");
        }
        setSubmitting(false);
      })
      .catch(err => {
        let message = 'Could not submit your booking. Please try again.';
        if (err.response?.status === 401) message = 'Please log in to book this event.';
        if (err.response?.status === 409) message = err.response?.data?.message || "You've already booked this event.";
        setBookingError(message);
        toast.error(message);
        setSubmitting(false);
      });
  };

  const isAtCapacity = event && event.capacity != null && event.bookedCount >= event.capacity;

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
        <div className="event-details-title-row">
          <h1>{event.name}</h1>
          <FavoriteButton
            eventId={event._id}
            isFavorited={event.isFavorited}
            onChange={(next) => setEvent((current) => ({ ...current, isFavorited: next }))}
          />
        </div>
        {event.reviewCount > 0 && (
          <div className="event-rating-summary">
            <StarRating value={event.avgRating} />
            <span>{event.avgRating} ({event.reviewCount} review{event.reviewCount === 1 ? '' : 's'})</span>
          </div>
        )}
        <img src={event.imageUrl} alt={event.name} className="event-image" />
        <p className="event-price">
          {event.price != null ? `₹${event.price.toLocaleString('en-IN')}` : 'Contact us for pricing'}
        </p>
        <p>{event.description}</p>
        <h3><strong>Category:</strong> {event.category.charAt(0).toUpperCase() + event.category.slice(1)}</h3>

        {event.location && (
          <Reveal className="event-location">
            <h3><strong>Location:</strong> {event.location}</h3>
            <EventMap location={event.location} name={event.name} />
          </Reveal>
        )}

        <StaggerGroup className="event-info-grid">
          {[
            { icon: 'bi-info-circle', label: 'Details', value: event.details },
            { icon: 'bi-people', label: 'Activities', value: event.activities },
            { icon: 'bi-palette', label: 'Decorations', value: event.decorations },
            { icon: 'bi-controller', label: 'Games', value: event.games },
          ].filter((item) => item.value).map((item) => (
            <StaggerItem key={item.label} className="event-info-card">
              <div className="event-info-icon">
                <i className={`bi ${item.icon}`}></i>
              </div>
              <h3>{item.label}</h3>
              <p>{item.value}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Link to={`/category/${event.category}`} className="back-link">
          Back to {event.category.charAt(0).toUpperCase() + event.category.slice(1)} Events
        </Link>

        <div className="reviews-container" id="reviews">
          <h3>Reviews</h3>

          {isAuthenticated && (
            event.completed ? (
              <form className="review-form" onSubmit={handleReviewSubmit}>
                <StarRating value={reviewRating} onChange={setReviewRating} readOnly={false} />
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this event..."
                />
                <button type="submit" className="btn btn-secondary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <p className="reviews-not-open-note">Reviews open once this event has taken place.</p>
            )
          )}

          {reviewsLoading ? (
            <Skeleton count={2} />
          ) : reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first to share your experience!</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="review-card">
                  <div className="review-header">
                    <StarRating value={review.rating} />
                    <span className="review-author">{review.name}</span>
                  </div>
                  {review.comment && <p className="review-comment">{review.comment}</p>}
                  {review.adminReply?.text && (
                    <div className="review-admin-reply">
                      <strong>Response from Evento:</strong> {review.adminReply.text}
                    </div>
                  )}
                  {(review.user === userId || isAdmin) && (
                    <button
                      type="button"
                      className="review-delete-btn"
                      onClick={() => handleReviewDelete(review._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="book-form-container">
          <h3>Book This Event</h3>

          {event.capacity != null && (
            <p className="capacity-note">
              {isAtCapacity
                ? 'This event is at capacity — new bookings will join the waiting list.'
                : `${event.capacity - event.bookedCount} of ${event.capacity} spots left`}
            </p>
          )}

          {!isAuthenticated ? (
            <p>
              Please <Link to="/login">log in</Link> (or{' '}
              <Link to="/register">create an account</Link>) to book this event.
            </p>
          ) : formSubmitted ? (
            <p>
              {bookingStatus === 'waitlisted'
                ? "Thank you! You're on the waiting list — we'll notify you if a spot opens up."
                : bookingStatus === 'pending_payment'
                  ? <>Your spot is being held. <Link to="/my-bookings">Complete the advance payment</Link> to confirm it.</>
                  : 'Thank you! Your booking is confirmed — we will contact you soon.'}
            </p>
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
                <label htmlFor="phone">Contact Phone Number:</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="For day-of coordination"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Venue Address:</label>
                <LocationAutocomplete
                  value={formData.address}
                  onChange={(value) => setFormData((current) => ({ ...current, address: value }))}
                  placeholder="Where should we set up?"
                />
                {formData.address.trim().length > 3 && (
                  <EventMap location={formData.address} name="Venue location" />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="date">Event Date:</label>
                <AnimatedDatePicker
                  id="date"
                  value={formData.date}
                  onChange={(value) => setFormData((current) => ({ ...current, date: value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Event Time:</label>
                <AnimatedTimePicker
                  id="time"
                  value={formData.time}
                  onChange={(value) => setFormData((current) => ({ ...current, time: value }))}
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
                {submitting ? 'Submitting...' : isAtCapacity ? 'Join Waiting List' : 'Submit Booking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default EventDetails;
