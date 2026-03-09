/**
 * In-memory rate limiting utility for Edge Functions
 * Uses sliding window algorithm per IP address
 */

// Store: IP -> array of request timestamps
const requests = new Map<string, number[]>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - windowMs;
  
  for (const [ip, timestamps] of requests.entries()) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      requests.delete(ip);
    } else {
      requests.set(ip, valid);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until window resets
}

/**
 * Check if a request is allowed under rate limit
 * @param ip - Client IP address
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 min)
 */
export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  
  // Cleanup periodically
  cleanup(windowMs);
  
  // Get existing timestamps for this IP
  const timestamps = requests.get(ip) || [];
  
  // Filter to only include timestamps within the window
  const validTimestamps = timestamps.filter(t => t > cutoff);
  
  // Calculate remaining requests
  const remaining = Math.max(0, limit - validTimestamps.length);
  
  // Calculate reset time (oldest timestamp + window, or now + window if empty)
  const oldestInWindow = validTimestamps.length > 0 ? validTimestamps[0] : now;
  const resetIn = Math.ceil((oldestInWindow + windowMs - now) / 1000);
  
  if (validTimestamps.length >= limit) {
    // Rate limit exceeded
    requests.set(ip, validTimestamps);
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.max(1, resetIn)
    };
  }
  
  // Add current request timestamp
  validTimestamps.push(now);
  requests.set(ip, validTimestamps);
  
  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetIn: Math.max(1, resetIn)
  };
}

/**
 * Extract client IP from request headers
 * Supports Cloudflare and standard proxy headers
 */
export function getClientIP(req: Request): string {
  // Cloudflare
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  // Standard proxy header
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Create rate limit exceeded response with proper headers
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message: 'Muitas requisições. Tente novamente em alguns segundos.',
      retryAfter: result.resetIn
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.resetIn),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetIn)
      }
    }
  );
}
