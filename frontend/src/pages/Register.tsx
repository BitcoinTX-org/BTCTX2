import React, { useState } from 'react';
import api from '../api'; // <<-- Import your custom Axios instance

/**
 * A simple registration page for a single-user system.
 *
 * Key points:
 *  - We call POST /users/register (the baseURL "/api" in `api.ts` 
 *    will prepend "/api", resulting in a final call to "/api/users/register").
 *  - `withCredentials` is already set in `api.ts`.
 *  - On success, we can auto-login or redirect to the login page.
 */
const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Handle the form submission:
  // Prevent default submission, call the correct endpoint, handle success/errors.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Because `baseURL="/api"` in api.ts, calling /users/register => /api/users/register
      const response = await api.post('/users/register', { username, password });
      console.log('Register response:', response.data);

      // ------------------------------------------------------
      // Option A: Auto-login the newly created user
      // ------------------------------------------------------
      /*
      const loginResponse = await api.post('/login', { username, password });
      console.log('Login response:', loginResponse.data);
      // Now that they're logged in, redirect to your main dashboard:
      window.location.href = '/dashboard';
      */

      // ------------------------------------------------------
      // Option B: Direct them to the login page
      // ------------------------------------------------------
      // If you'd rather not auto-login, just show a success message and redirect:
      alert('Registration successful! Please log in.');
      window.location.href = '/login';

    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register. Try another username.');
    }
  };

  return (
    <div className="register-container">
      <h2>Create an Account</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default RegisterPage;
