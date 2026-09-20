// In-memory high-speed cache for backend read requests
// Dramatically reduces database round-trips to remote cloud DBs (Neon/AWS)

const _store = new Map();

function get(key) {
  const item = _store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    _store.delete(key);
    return null;
  }
  return item.data;
}

function set(key, data, ttlSeconds = 60) {
  _store.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
}

function del(pattern = '') {
  if (!pattern) {
    _store.clear();
    return;
  }
  for (const key of _store.keys()) {
    if (key.includes(pattern)) {
      _store.delete(key);
    }
  }
}

/**
 * Express middleware to automatically cache GET endpoints.
 * Returns cached responses in < 1ms, eliminating cloud DB network latency.
 */
function cacheMiddleware(ttlSeconds = 30) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Cache key incorporates user id/role if authenticated (so voter views remain secure/isolated)
    const userKey = req.user ? `${req.user.role}:${req.user.id}` : 'public';
    const cacheKey = `${req.baseUrl}${req.path}:${userKey}`;

    const cachedData = get(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Intercept res.json to store fresh data in cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body && !body.error) {
        set(cacheKey, body, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

module.exports = { get, set, del, cacheMiddleware };
