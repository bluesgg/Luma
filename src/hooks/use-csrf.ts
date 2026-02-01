'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage CSRF token
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/csrf')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCsrfToken(data.data.token);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch CSRF token:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { csrfToken, isLoading };
}
