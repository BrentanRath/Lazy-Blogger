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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for auth success/failure in URL params
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success') {
      // Add a small delay to ensure session is set
      setTimeout(() => {
        checkAuthStatus();
      }, 500);
    } else if (authStatus === 'error') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://testblogapi.notafemboy.org/auth/verify', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('Failed to verify authentication status');
    }
  };

  const handleSlackLogin = () => {
    setIsLoading(true);
    setError('');
    window.location.href = 'http://testblogapi.notafemboy.org/auth/slack/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('http://testblogapi.notafemboy.org/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed');
    }
  };

  if (user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome, {user.name}!</h1>
        <p>Team: {user.team}</p>
        <p>Email: {user.email}</p>
        <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
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