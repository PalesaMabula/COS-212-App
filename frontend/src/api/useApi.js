import { useCallback, useEffect, useState } from 'react';
import { api } from './client';

/*
 * Load something from the Python server.
 *   const { data, loading, error, reload } = useApi('/api/topics/2.4');
 * GET results are cached for the session (course content doesn't change while
 * the app is open). Pass null as the path to skip loading.
 */
const cache = new Map();

export default function useApi(path) {
  const [state, setState] = useState(() =>
    path && cache.has(path) ? { data: cache.get(path), loading: false, error: null } : { data: null, loading: !!path, error: null }
  );
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    if (cache.has(path)) {
      setState({ data: cache.get(path), loading: false, error: null });
      return undefined;
    }
    let live = true;
    setState((s) => ({ data: s.data, loading: true, error: null }));
    api(path)
      .then((data) => {
        cache.set(path, data);
        if (live) setState({ data, loading: false, error: null });
      })
      .catch((error) => live && setState({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
  }, [path, nonce]);

  const reload = useCallback(() => {
    cache.delete(path);
    setNonce((n) => n + 1);
  }, [path]);

  return { ...state, reload };
}

/** POST helper for actions (checking answers, running code). */
export const post = (path, body) => api(path, { method: 'POST', body, timeout: 8000 });
