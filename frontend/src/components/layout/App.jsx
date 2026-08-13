import { useEffect } from 'react';
import './App.css';
import Event from '../events/Events.jsx';
import Home from '../home/Home.jsx';
import Login from '../auth/Login';
import Register from '../auth/Register';
import ForgotPassword from '../auth/ForgotPassword.jsx';
import ResetPassword from '../auth/ResetPassword.jsx';
import About from '../home/About.jsx';
import Footer from './Footer';
import EventDetails from '../events/EventDetails.jsx';
import CategoryEvents from '../events/Category.jsx';
import MyBookings from '../profile/MyBookings.jsx';
import Favorites from '../profile/Favorites.jsx';
import ChangePassword from '../auth/ChangePassword.jsx';
import Profile from '../profile/Profile.jsx';
import AdminEvents from '../admin/AdminEvents.jsx';
import AdminEventForm from '../admin/AdminEventForm.jsx';
import AdminBookings from '../admin/AdminBookings.jsx';
import AdminAnalytics from '../admin/AdminAnalytics.jsx';
import AdminReviews from '../admin/AdminReviews.jsx';
import AdminCustomers from '../admin/AdminCustomers.jsx';
import NotFound from '../shared/NotFound.jsx';
import PageTransition from '../shared/PageTransition.jsx';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';

const ROUTES = [
  { path: '/register', element: <Register /> },
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password/:token', element: <ResetPassword /> },
  { path: '/home', element: <Home /> },
  { path: '/events', element: <Event /> },
  { path: '/events/:eventId', element: <EventDetails /> },
  { path: '/about', element: <About /> },
  { path: '/category/:categoryId', element: <CategoryEvents /> },
  { path: '/my-bookings', element: <MyBookings /> },
  { path: '/favorites', element: <Favorites /> },
  { path: '/change-password', element: <ChangePassword /> },
  { path: '/profile', element: <Profile /> },
  { path: '/admin', element: <Navigate to="/admin/events" replace /> },
  { path: '/admin/events', element: <AdminEvents /> },
  { path: '/admin/events/new', element: <AdminEventForm /> },
  { path: '/admin/events/:id/edit', element: <AdminEventForm /> },
  { path: '/admin/bookings', element: <AdminBookings /> },
  { path: '/admin/analytics', element: <AdminAnalytics /> },
  { path: '/admin/reviews', element: <AdminReviews /> },
  { path: '/admin/customers', element: <AdminCustomers /> },
];

function AnimatedRoutes() {
  const location = useLocation();

  // React Router doesn't reset scroll position on navigation, so without
  // this a route change into the page-transition animation would start
  // from wherever the previous page happened to be scrolled to.
  useEffect(() => {
    // A hash in the URL (e.g. #reviews) means the destination page wants to
    // scroll to a specific section itself — don't fight it by resetting to top.
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={<PageTransition>{element}</PageTransition>} />
        ))}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-container">
        <BrowserRouter>
          <div className="main-content">
            <AnimatedRoutes />
          </div>
          {/* Footer rendered once outside of Routes */}
          <Footer />
        </BrowserRouter>
      </div>
    </MotionConfig>
  );
}

export default App;
