import { useState, useEffect } from 'react';
import { WaterType } from '@/lib/solunar';

export function useWaterType() {
  const [waterType, setWaterTypeState] = useState<WaterType>(() => {
    const saved = localStorage.getItem('digon_water_type');
    return (saved === 'freshwater' || saved === 'saltwater') ? saved : 'saltwater';
  });

  const setWaterType = (type: WaterType) => {
    localStorage.setItem('digon_water_type', type);
    setWaterTypeState(type);
    window.dispatchEvent(new Event('waterTypeChanged'));
  };

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('digon_water_type');
      if (saved === 'freshwater' || saved === 'saltwater') {
        setWaterTypeState(saved);
      }
    };
    window.addEventListener('waterTypeChanged', handleStorage);
    return () => window.removeEventListener('waterTypeChanged', handleStorage);
  }, []);

  return { waterType, setWaterType };
}
