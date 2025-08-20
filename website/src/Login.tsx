import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  const handleEnterApp = () => {
    console.log('Entering app without authentication');
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Lazy Blogger</h1>
      <p>Audio recording and grammar correction tool</p>
      
      <div style={{ margin: '30px 0' }}>
        <p>Welcome! This application helps you record audio and correct grammar.</p>
        <p>No authentication required - click below to get started.</p>
      </div>
      
      <button 
        onClick={handleEnterApp}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          fontSize: '18px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Enter Application
      </button>
    </div>
  );
}

export default Login;