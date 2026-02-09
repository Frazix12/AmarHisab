/**
 * Input Validation & Sanitization Service
 * Protects against malicious inputs including XSS, SQL injection, and code injection
 */

// Dangerous patterns to detect and block
// Note: No /g flag used - global flag makes RegExp.test() stateful which causes
// inconsistent results when the same regex is tested multiple times.
const DANGEROUS_PATTERNS = [
  // Script injection
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick=, onerror=, etc.
  
  // SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)/i,
  /(['"])\s*;\s*--/i, // SQL comment after quote
  /\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i, // OR 1=1
  /\bAND\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i, // AND 1=1
  
  // Code injection
  /eval\s*\(/i,
  /Function\s*\(/i,
  /new\s+Function/i,
  /require\s*\(/i,
  /import\s*\(/i,
  /__proto__/i,
  /constructor\s*\[/i,
  
  // Path traversal (Unix and Windows)
  /\.\.\//,      // ../
  /\.\.\\/,      // ..\  (single backslash for Windows paths)
  
  // Null bytes (can bypass validation)
  /\x00/,
  /%00/i,
];

// Characters to encode for safe display
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Check if text contains potentially malicious patterns
 */
export function containsMaliciousPatterns(text: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Encode HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize text input by removing dangerous patterns and encoding special characters
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text.trim();
  
  // Enforce max length first
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '').replace(/%00/gi, '');
  
  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Encode HTML entities for safe storage/display
  sanitized = escapeHtml(sanitized);
  
  return sanitized;
}

/**
 * Validate and sanitize a description/note field
 */
export function validateDescription(text: string, maxLength: number = 200): ValidationResult {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Description is required' };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Description cannot be empty' };
  }
  
  if (trimmed.length > maxLength) {
    return { 
      isValid: false, 
      error: `Description must be ${maxLength} characters or less` 
    };
  }
  
  // Check for malicious patterns
  if (containsMaliciousPatterns(trimmed)) {
    return { 
      isValid: false, 
      error: 'Description contains invalid characters' 
    };
  }
  
  return { 
    isValid: true, 
    sanitized: sanitizeText(trimmed, maxLength) 
  };
}

/**
 * Validate a monetary amount
 */
export function validateAmount(amount: unknown): ValidationResult {
  // Handle string inputs
  let numAmount: number;
  
  if (typeof amount === 'string') {
    // Remove currency symbols and whitespace
    const cleaned = amount.replace(/[^\d.-]/g, '');
    numAmount = parseFloat(cleaned);
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else {
    return { isValid: false, error: 'Invalid amount format' };
  }
  
  // Check for valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  // Must be positive
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  // Reasonable maximum (10 million)
  const MAX_AMOUNT = 10_000_000;
  if (numAmount > MAX_AMOUNT) {
    return { 
      isValid: false, 
      error: `Amount cannot exceed ${MAX_AMOUNT.toLocaleString()}` 
    };
  }
  
  // Limit decimal places to 2
  const rounded = Math.round(numAmount * 100) / 100;
  
  return { 
    isValid: true, 
    sanitized: rounded.toString() 
  };
}

/**
 * Validate a name field (grocery item, category, etc.)
 */
export function validateName(name: string, maxLength: number = 100): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmed.length > maxLength) {
    return { 
      isValid: false, 
      error: `Name must be ${maxLength} characters or less` 
    };
  }
  
  // Check for malicious patterns
  if (containsMaliciousPatterns(trimmed)) {
    return { 
      isValid: false, 
      error: 'Name contains invalid characters' 
    };
  }
  
  return { 
    isValid: true, 
    sanitized: sanitizeText(trimmed, maxLength) 
  };
}

/**
 * Validate a quantity string (e.g., "2kg", "1 liter", "10")
 */
export function validateQuantity(quantity: string): ValidationResult {
  if (!quantity || typeof quantity !== 'string') {
    return { isValid: true, sanitized: '' }; // Quantity is optional
  }
  
  const trimmed = quantity.trim();
  
  if (trimmed.length === 0) {
    return { isValid: true, sanitized: '' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Quantity is too long' };
  }
  
  // Check for malicious patterns
  if (containsMaliciousPatterns(trimmed)) {
    return { 
      isValid: false, 
      error: 'Quantity contains invalid characters' 
    };
  }
  
  return { 
    isValid: true, 
    sanitized: sanitizeText(trimmed, 50) 
  };
}

/**
 * Sanitize text for safe inclusion in AI prompts
 * Prevents prompt injection attacks
 */
export function sanitizeForAIPrompt(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text.trim();
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  sanitized = sanitized.replace(/%00/gi, '');
  
  // Escape characters that could be used for prompt injection
  // Replace triple quotes and backticks that could break out of string contexts
  sanitized = sanitized
    .replace(/"""/g, '"')
    .replace(/```/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
  
  // Remove potential instruction markers
  sanitized = sanitized
    .replace(/^(system|user|assistant|human|ai):\s*/gim, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|.*?\|>/g, ''); // Remove special tokens like <|endoftext|>
  
  return sanitized;
}

/**
 * Validate an API key format (basic validation)
 */
export function validateApiKey(key: string): ValidationResult {
  if (!key || typeof key !== 'string') {
    return { isValid: true, sanitized: '' }; // API key is optional
  }
  
  const trimmed = key.trim();
  
  if (trimmed.length === 0) {
    return { isValid: true, sanitized: '' };
  }
  
  // API keys should only contain alphanumeric characters, dashes, and underscores
  const validKeyPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validKeyPattern.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Invalid API key format' 
    };
  }
  
  // Reasonable length limits for API keys
  if (trimmed.length < 10 || trimmed.length > 200) {
    return { 
      isValid: false, 
      error: 'API key length is invalid' 
    };
  }
  
  return { 
    isValid: true, 
    sanitized: trimmed 
  };
}

/**
 * Rate limiter for form submissions to prevent spam
 */
const submissionTimestamps = new Map<string, number[]>();
const MAX_SUBMISSIONS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// NOTE: This limiter is process-local. It does not work across multiple
// instances/serverless invocations. Use Redis or another shared store for
// distributed deployments.
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const cleanupRateLimitMap = () => {
  const now = Date.now();
  for (const [formId, timestamps] of submissionTimestamps.entries()) {
    const recentTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW);
    if (recentTimestamps.length === 0) {
      submissionTimestamps.delete(formId);
      continue;
    }
    submissionTimestamps.set(formId, recentTimestamps);
  }
};

const rateLimitCleanupInterval = setInterval(
  cleanupRateLimitMap,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
);

const maybeTimerWithUnref = rateLimitCleanupInterval as unknown;
if (
  typeof maybeTimerWithUnref === "object" &&
  maybeTimerWithUnref !== null &&
  "unref" in maybeTimerWithUnref &&
  typeof maybeTimerWithUnref.unref === "function"
) {
  maybeTimerWithUnref.unref();
}

export function checkRateLimit(formId: string): boolean {
  const now = Date.now();
  const timestamps = submissionTimestamps.get(formId) || [];
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_SUBMISSIONS_PER_MINUTE) {
    return false; // Rate limited
  }
  
  // Add current timestamp
  recentTimestamps.push(now);
  submissionTimestamps.set(formId, recentTimestamps);
  
  return true; // Allowed
}

/**
 * Clear rate limit for a specific form (e.g., after successful submission)
 */
export function clearRateLimit(formId: string): void {
  submissionTimestamps.delete(formId);
}

export function clearAllRateLimits(): void {
  submissionTimestamps.clear();
}

export function stopRateLimitCleanup(): void {
  clearInterval(rateLimitCleanupInterval);
}
