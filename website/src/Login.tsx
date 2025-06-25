import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  profilePicture?: string;
}

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('=== LOGIN COMPONENT MOUNTED ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const authStatus = searchParams.get('auth');
    const token = searchParams.get('token');
    
    console.log('Auth status:', authStatus);
    console.log('Token found:', token ? token.substring(0, 50) + '...' : 'None');
    
    if (authStatus === 'success' && token) {
      console.log('SUCCESS: Storing token and navigating to dashboard');
      localStorage.setItem('auth_token', token);
      console.log('Token stored in localStorage');
      
      window.history.replaceState({}, document.title, '/dashboard');
      console.log('URL cleaned, navigating to dashboard');
      
      navigate('/dashboard');
    } else if (authStatus === 'error') {
      console.log('AUTH ERROR: Setting error state');
      setError('Authentication failed. Please try again.');
      setAuthLoading(false);
    } else {
      console.log('NO AUTH PARAMS: Checking existing auth status');
      checkAuthStatus();
    }
  }, [searchParams, navigate]);

  const checkAuthStatus = async () => {
    console.log('=== LOGIN: checkAuthStatus called ===');
    const token = localStorage.getItem('auth_token');
    console.log('Token from localStorage:', token ? token.substring(0, 50) + '...' : 'None');
    
    if (!token) {
      console.log('No token found, showing login form');
      setAuthLoading(false);
      return;
    }

    try {
      console.log('Verifying token with API...');
      const response = await fetch('https://testblogapi.notafemboy.org/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Auth verification response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth verification data:', data);
        
        if (data.authenticated) {
          console.log('User is authenticated, setting user data and navigating to dashboard');
          setUser(data.user);
          navigate('/dashboard');
        } else {
          console.log('User not authenticated, removing token');
          localStorage.removeItem('auth_token');
        }
      } else {
        console.log('Auth verification failed, removing token');
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
    console.log('Starting Slack login...');
    setIsLoading(true);
    setError('');
    window.location.href = 'https://testblogapi.notafemboy.org/auth/slack/login';
  };

  const handleLogout = async () => {
    console.log('Logging out...');
    localStorage.removeItem('auth_token');
    setUser(null);
    setError('');
    navigate('/login');
  };

  if (authLoading) {
    console.log('LOGIN: Showing loading spinner');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading...</h1>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (user) {
    console.log('LOGIN: User is logged in, showing welcome message');
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

  console.log('LOGIN: Showing login form');
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