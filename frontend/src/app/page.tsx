'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import ContractUpload from '@/components/ContractUpload';
import ContractsList from '@/components/ContractsList';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InvoicesProvider } from '@/context/InvoicesContext';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initMessage, setInitMessage] = useState('');
  
  const initializeIndex = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey');
      const organizationId = localStorage.getItem('organization_id');
      const projectId = localStorage.getItem('project_id');
      
      const response = await fetch('/api/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || '',
          'X-Organization-Id': organizationId || '',
          'X-Project-Id': projectId || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('index_id', data.index_id);
        setInitMessage('Index initialized');
        setTimeout(() => setInitMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error initializing index:', err);
    }
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('apiKey');
    if (storedKey) {
      setIsLoggedIn(true);
      initializeIndex();
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    initializeIndex();
  };

  const handleLogout = () => {
    localStorage.removeItem('apiKey');
    localStorage.removeItem('project_id');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('index_id');
    setIsLoggedIn(false);
  };

  return (
    <>
      {isLoggedIn ? (
        <>
          <div className="fixed top-4 right-4 z-10">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
          {initMessage && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Alert>
                <AlertDescription>{initMessage}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="max-w-2xl mx-auto px-4 pt-4">
            <InvoicesProvider>
              <ContractUpload />
              <ContractsList />
            </InvoicesProvider>
          </div>
        </>
      ) : (
        <Login onLoginSuccess={handleLogin} />
      )}
    </>
  );
}
