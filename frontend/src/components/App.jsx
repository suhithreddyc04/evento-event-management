import { useEffect } from 'react';
import './App.css';
import Event from './events.jsx';
import Home from './Home.jsx';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import About from './about.jsx';
import Footer from './Footer';
import EventDetails from './eventdetails.jsx';
import CategoryEvents from './category.jsx';
import MyBookings from './MyBookings.jsx';
import Favorites from './Favorites.jsx';
import ChangePassword from './ChangePassword.jsx';
import Profile from './Profile.jsx';
import Admin from './Admin.jsx';
import NotFound from './NotFound.jsx';
import PageTransition from './PageTransition.jsx';
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
  { path: '/admin', element: <Admin /> },
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
