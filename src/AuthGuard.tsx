import React, { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('yelo_auth');
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const now = new Date().getTime();
          
          if (parsed.expiry && now < parsed.expiry) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('yelo_auth');
            redirectToLogin();
          }
        } catch (error) {
          localStorage.removeItem('yelo_auth');
          redirectToLogin();
        }
      } else {
        redirectToLogin();
      }
      
      setIsLoading(false);
    };

    const redirectToLogin = () => {
      window.location.href = 'https://yelo-dashboard.web.app/login.html';
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        background: '#fffbe7'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>🔐</div>
        <div>Checking authentication...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default AuthGuard;