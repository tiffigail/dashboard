// src/components/HomePage/HomePage.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Welcome from '../Welcome/Welcome.jsx';

const HomePage = () => {
  const { currentUser } = useAuth();

  // If a user is logged in, navigate to "/now". Otherwise, show the Welcome page.
  return currentUser ? <Navigate to="/now" replace /> : <Welcome />;
};

export default HomePage;