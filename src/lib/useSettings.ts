// @ts-nocheck
import { useEffect, useState } from 'react';
import API from './api';

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/settings')
      .then(r => setSettings(r.data))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
