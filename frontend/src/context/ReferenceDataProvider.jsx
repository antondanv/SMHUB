import { useEffect, useState } from 'react';
import { getReferenceData } from '../api/referenceApi';
import { ReferenceDataContext } from './referenceDataContext';

const emptyReferenceData = {
  courses: [],
  programs: [],
  subjects: [],
  materialTypes: [],
};

export function ReferenceDataProvider({ children }) {
  const [referenceData, setReferenceData] = useState(emptyReferenceData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadReferenceData() {
      try {
        const data = await getReferenceData();

        if (isActive) {
          setReferenceData(data);
          setError(null);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadReferenceData();

    return () => {
      isActive = false;
    };
  }, []);

  async function refreshReferenceData() {
    setIsLoading(true);

    try {
      const data = await getReferenceData({ force: true });

      setReferenceData(data);
      setError(null);
      return data;
    } catch (refreshError) {
      setError(refreshError);
      throw refreshError;
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    ...referenceData,
    isLoading,
    error,
    refreshReferenceData,
  };

  return (
    <ReferenceDataContext.Provider value={value}>
      {children}
    </ReferenceDataContext.Provider>
  );
}
