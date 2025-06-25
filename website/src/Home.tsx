import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  id: string;
  name: string;
  email: string;
  team: string;
}

function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== HOME COMPONENT MOUNTED ===');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('=== HOME: checkAuthStatus called ===');
    
    const token = localStorage.getItem('auth_token');
    console.log('Token from localStorage:', token ? token.substring(0, 50) + '...' : 'None');
    
    if (!token) {
      console.log('HOME: No token found, user is not authenticated');
      setIsAuthenticated(false);
      setAuthLoading(false);
      return;
    }

    try {
      console.log('HOME: Verifying token with API...');
      
      const response = await fetch('https://testblogapi.notafemboy.org/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('HOME: Auth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('HOME: Auth response data:', data);
        
        if (data.authenticated) {
          console.log('HOME: User authenticated, setting user data');
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          console.log('HOME: User not authenticated');
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
        }
      } else {
        console.log('HOME: Auth verification failed');
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('HOME: Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading...</h2>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>Welcome ^w^</h1>
      
      
      {isAuthenticated ? (
        <div>
          <p>You are logged in as {user?.name}.</p>
          <button 
            onClick={handleDashboard}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div>
          <p>Sign in to access dashboard</p>
          <button 
            onClick={handleLogin}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
}

export default Home