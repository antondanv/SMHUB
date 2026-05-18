import { useContext } from 'react';
import { ReferenceDataContext } from './referenceDataContext';

export function useReferenceData() {
  const context = useContext(ReferenceDataContext);

  if (!context) {
    throw new Error('useReferenceData must be used within ReferenceDataProvider');
  }

  return context;
}
