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
