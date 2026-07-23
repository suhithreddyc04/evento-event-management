import React from 'react';
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
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/home" element={<Home />} />
            <Route path="/events" element={<Event />} />
            <Route path="/events/:eventId" element={<EventDetails />} />
            <Route path='/about' element={<About/>}/>
            <Route path="/category/:categoryId" element={<CategoryEvents />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {/* Footer rendered once outside of Routes */}
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
