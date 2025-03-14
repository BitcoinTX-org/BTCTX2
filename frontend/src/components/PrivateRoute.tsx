// FILE: PrivateRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api'; // <- Custom Axios instance with baseURL="/api"

interface PrivateRouteProps {
  children: JSX.Element;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Attempt to hit a protected endpoint that checks session
    // This will call GET /api/protected due to baseURL="/api"
    api
      .get('/protected')
      .then(() => {
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    // Not logged in => redirect to /login
    return <Navigate to="/login" replace />;
  }

  // Authenticated => render the wrapped component
  return children;
};

export default PrivateRoute;
