import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  team: string;
}

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for auth success/failure in URL params
    const authStatus = searchParams.get('auth');
    const token = searchParams.get('token');
    
    if (authStatus === 'success' && token) {
      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      // Remove token from URL for security
      window.history.replaceState({}, document.title, '/dashboard');
      // Navigate to dashboard immediately
      navigate('/dashboard');
    } else if (authStatus === 'error') {
      setError('Authentication failed. Please try again.');
      setAuthLoading(false);
    } else {
      // Check if user is already authenticated
      checkAuthStatus();
    }
  }, [searchParams, navigate]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch('https://testblogapi.notafemboy.org/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          // Navigate to dashboard if already authenticated
          navigate('/dashboard');
        } else {
          localStorage.removeItem('auth_token');
        }
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setError('Failed to verify authentication status');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSlackLogin = () => {
    setIsLoading(true);
    setError('');
    window.location.href = 'https://testblogapi.notafemboy.org/auth/slack/login';
  };

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setError('');
    navigate('/login');
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading...</h1>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  // If user is already logged in, show welcome message
  if (user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome back, {user.name}!</h1>
        <p>Team: {user.team}</p>
        <p>Email: {user.email}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Go to Dashboard
        </button>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Login to Blogging Platform</h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '20px', 
          padding: '10px', 
          border: '1px solid red', 
          borderRadius: '4px',
          backgroundColor: '#ffe6e6'
        }}>
          {error}
        </div>
      )}
      
      <button 
        onClick={handleSlackLogin}
        disabled={isLoading}
        style={{
          backgroundColor: '#4A154B',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          fontSize: '16px',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? 'Connecting...' : 'Sign in with Slack'}
      </button>
    </div>
  );
}

export default Login;