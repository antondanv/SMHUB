import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const HomePage = () => {
  const [healthStatus, setHealthStatus] = useState('checking...');

  useEffect(() => {
    apiClient.get('/health')
      .then(response => {
        setHealthStatus(response.data.status === 'ok' ? 'Online' : 'Error');
      })
      .catch(error => {
        console.error('Health check failed:', error);
        setHealthStatus('Offline');
      });
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Добро пожаловать в SMHUB</h1>
      <p className="text-xl mb-8">Платформа для обмена учебными материалами</p>
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 inline-block">
        <h2 className="text-2xl font-semibold mb-2">Статус Backend:</h2>
        <p className={`text-xl font-bold ${healthStatus === 'Online' ? 'text-green-500' : 'text-red-500'}`}>
          {healthStatus}
        </p>
      </div>
      
      <div className="mt-8">
        <p className="text-gray-600 italic">Здесь скоро появится лента актуальных материалов.</p>
      </div>
    </div>
  );
};

export default HomePage;
