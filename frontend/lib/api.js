const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── In-memory response cache ──────────────────────────────────────────────
// GET responses are cached for CACHE_TTL ms to eliminate repeated round-trips.
// Stale data is shown instantly while a background refresh runs.
const CACHE_TTL = 30_000; // 30 seconds
const _cache = new Map();      // key → { data, expiresAt }
const _inflight = new Map();   // key → Promise  (dedup parallel calls)

function _cacheKey(endpoint, token) {
  return `${token || 'anon'}::${endpoint}`;
}

function _getCached(key) {
  let entry = _cache.get(key);
  if (!entry && typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`_c_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() <= parsed.expiresAt) {
          entry = parsed;
          _cache.set(key, entry);
        } else {
          sessionStorage.removeItem(`_c_${key}`);
        }
      }
    } catch {}
  }
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(`_c_${key}`); } catch {}
    }
    return null;
  }
  return entry.data;
}

function _setCached(key, data) {
  const expiresAt = Date.now() + CACHE_TTL;
  const entry = { data, expiresAt };
  _cache.set(key, entry);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`_c_${key}`, JSON.stringify(entry));
    } catch {}
  }
}

/** Invalidate all cache entries whose key contains `pattern` */
export function invalidateCache(pattern = '') {
  for (const key of _cache.keys()) {
    if (!pattern || key.includes(pattern)) _cache.delete(key);
  }
  if (typeof window !== 'undefined') {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('_c_') && (!pattern || k.includes(pattern))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

// ─── Auth helpers ──────────────────────────────────────────────────────────
export const getAuthToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('token');
  return null;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    _cache.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('_c_')) sessionStorage.removeItem(k);
      }
    } catch {}
  }
};

export const getStoredUser = () => {
  if (typeof window !== 'undefined') {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  }
  return null;
};

export const setStoredUser = (user) => {
  if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
};

// ─── Core fetch wrapper ─────────────────────────────────────────────────────
export async function fetchApi(endpoint, options = {}) {
  const token = getAuthToken();
  const method = (options.method || 'GET').toUpperCase();
  const isRead = method === 'GET';

  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── Cache path for GET requests ──────────────────────────────────────────
  if (isRead) {
    const cacheKey = _cacheKey(endpoint, token);
    const cached = _getCached(cacheKey);

    if (cached) {
      // Return cached data immediately, then silently refresh in background
      _doFetch(endpoint, { ...options, headers }).then((fresh) => {
        _setCached(cacheKey, fresh);
      }).catch(() => {/* background refresh failed — keep stale data */});
      return cached;
    }

    // Dedup: if an identical request is already in-flight, wait for it
    if (_inflight.has(cacheKey)) return _inflight.get(cacheKey);

    const req = _doFetch(endpoint, { ...options, headers }).then((data) => {
      _setCached(cacheKey, data);
      _inflight.delete(cacheKey);
      return data;
    }).catch((err) => {
      _inflight.delete(cacheKey);
      throw err;
    });

    _inflight.set(cacheKey, req);
    return req;
  }

  // ── Mutation path (POST / PUT / PATCH / DELETE) ──────────────────────────
  // Invalidate related cache entries so next GET sees fresh data
  const data = await _doFetch(endpoint, { ...options, headers });
  _invalidateRelated(endpoint);
  return data;
}

async function _doFetch(endpoint, options) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'API Request Failed');
  return data;
}

/** Invalidate cache keys related to the mutated endpoint */
function _invalidateRelated(endpoint) {
  // e.g. POST /elections → invalidate all /elections* cache entries
  const base = '/' + endpoint.replace(/^\//, '').split('/')[0];
  invalidateCache(base);

  // Also bust adjacent resources that include counts or stats
  if (base === '/elections' || base === '/votes') invalidateCache('/admin');
  if (base === '/voters') invalidateCache('/voters');
}
