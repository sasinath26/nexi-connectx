import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPlatformEnvironment } from '../api/client';

const PlatformEnvironmentContext = createContext(null);

const FALLBACK = {
  environment: 'DEV',
  profile: 'default',
  production: false,
  readonly: false,
};

export function PlatformEnvironmentProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(FALLBACK);

  useEffect(() => {
    getPlatformEnvironment()
      .then((res) => {
        setData({
          environment: res.data?.environment ?? FALLBACK.environment,
          profile: res.data?.profile ?? FALLBACK.profile,
          production: Boolean(res.data?.production),
          readonly: Boolean(res.data?.readonly),
        });
      })
      .catch(() => setData(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      loading,
      ...data,
      isProduction: data.production || data.environment === 'PROD',
    }),
    [loading, data]
  );

  return (
    <PlatformEnvironmentContext.Provider value={value}>
      {children}
    </PlatformEnvironmentContext.Provider>
  );
}

export function usePlatformEnvironment() {
  const ctx = useContext(PlatformEnvironmentContext);
  if (!ctx) {
    throw new Error('usePlatformEnvironment must be used within PlatformEnvironmentProvider');
  }
  return ctx;
}
