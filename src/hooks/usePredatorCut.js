import { useEffect, useState } from "react";
import { fetchPredatorCut } from "../services/apexApi";

// The API refreshes the cut every few minutes; one request serves every
// component for a while
const CACHE_MS = 15 * 60 * 1000;
let cache = null; // { apiKey, data, until }
let inflight = null; // { apiKey, promise }

const loadCut = (apiKey) => {
  if (cache?.apiKey === apiKey && cache.until > Date.now()) {
    return Promise.resolve(cache.data);
  }
  if (inflight?.apiKey !== apiKey) {
    const promise = fetchPredatorCut({ apiKey })
      .then((data) => {
        cache = { apiKey, data, until: Date.now() + CACHE_MS };
        return data;
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });
    inflight = { apiKey, promise };
  }
  return inflight.promise;
};

/**
 * Apex Predator cut per platform (see fetchPredatorCut), or null while it
 * loads or when it can't be had; it's an extra, so failures stay quiet.
 */
export const usePredatorCut = (apiKey) => {
  const [cut, setCut] = useState(() =>
    cache?.apiKey === apiKey && cache.until > Date.now() ? cache.data : null,
  );

  useEffect(() => {
    if (!apiKey) return undefined;
    let cancelled = false;
    loadCut(apiKey)
      .then((data) => {
        if (!cancelled) setCut(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return apiKey ? cut : null;
};
