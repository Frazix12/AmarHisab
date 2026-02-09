/**
 * Rate Limiter & Retry Utility for API Calls
 * Handles rate limiting and exponential backoff retry
 */

// Rate limiter state
const rateLimiter = {
  calls: [] as number[],
  maxCalls: 10,           // Max 10 calls per window
  windowMs: 60 * 1000,    // 1 minute window
};

/**
 * Check if we can make an API call based on rate limits
 */
export function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove calls outside the window
  rateLimiter.calls = rateLimiter.calls.filter(
    (timestamp) => now - timestamp < rateLimiter.windowMs
  );
  return rateLimiter.calls.length < rateLimiter.maxCalls;
}

/**
 * Record an API call for rate limiting
 */
export function recordRequest(): void {
  rateLimiter.calls.push(Date.now());
}

/**
 * Get time to wait before next allowed request (ms)
 */
export function getWaitTime(): number {
  if (canMakeRequest()) return 0;
  const oldestCall = rateLimiter.calls[0];
  return oldestCall ? oldestCall + rateLimiter.windowMs - Date.now() : 0;
}

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Add jitter to delay to prevent thundering herd
 */
const addJitter = (delay: number): number => 
  delay + Math.random() * 500;

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 8000,   // 8 seconds max
};

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("429") || 
           error.message.toLowerCase().includes("rate limit") ||
           error.message.toLowerCase().includes("quota");
  }
  return false;
}

/**
 * Execute a function with exponential backoff retry
 * Automatically handles rate limiting and 429 errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string = "API call"
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    // Check rate limit before attempting
    if (!canMakeRequest()) {
      const waitTime = getWaitTime();
      console.log(`[RateLimiter] Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
      await sleep(waitTime);
    }
    
    try {
      recordRequest();
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw lastError;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= RETRY_CONFIG.maxRetries) {
        console.error(`[RateLimiter] ${context} failed after ${RETRY_CONFIG.maxRetries} retries`);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay
      );
      const jitteredDelay = addJitter(delay);
      
      console.log(
        `[RateLimiter] ${context} rate limited (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}), ` +
        `retrying in ${Math.round(jitteredDelay / 1000)}s`
      );
      
      await sleep(jitteredDelay);
    }
  }
  
  throw lastError ?? new Error("Unknown error during retry");
}

/**
 * Reset the rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiter.calls = [];
}
