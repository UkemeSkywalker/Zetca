/**
 * Input validation and sanitization utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  return { isValid: true };
}

/**
 * Validate user name
 * @param name - Name to validate
 * @returns Validation result with error message if invalid
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }

  return { isValid: true };
}

/**
 * Validate user bio
 * @param bio - Bio to validate (optional field)
 * @returns Validation result with error message if invalid
 */
export function validateBio(bio: string | undefined): ValidationResult {
  if (!bio) {
    return { isValid: true }; // Bio is optional
  }

  if (bio.length > 500) {
    return { isValid: false, error: 'Bio must be less than 500 characters' };
  }

  return { isValid: true };
}

/**
 * Sanitize user input to prevent injection attacks
 * Removes potentially dangerous characters and HTML tags
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize email
 * @param email - Email to validate and sanitize
 * @returns Validation result with sanitized email
 */
export function validateAndSanitizeEmail(email: string): ValidationResult & { sanitized?: string } {
  const sanitized = sanitizeInput(email).toLowerCase();
  const validation = validateEmail(sanitized);
  
  if (!validation.isValid) {
    return validation;
  }

  return { isValid: true, sanitized };
}

/**
 * Validate and sanitize name
 * @param name - Name to validate and sanitize
 * @returns Validation result with sanitized name
 */
export function validateAndSanitizeName(name: string): ValidationResult & { sanitized?: string } {
  const sanitized = sanitizeInput(name);
  const validation = validateName(sanitized);
  
  if (!validation.isValid) {
    return validation;
  }

  return { isValid: true, sanitized };
}

/**
 * Validate and sanitize bio
 * @param bio - Bio to validate and sanitize
 * @returns Validation result with sanitized bio
 */
export function validateAndSanitizeBio(bio: string | undefined): ValidationResult & { sanitized?: string } {
  if (!bio) {
    return { isValid: true, sanitized: undefined };
  }

  const sanitized = sanitizeInput(bio);
  const validation = validateBio(sanitized);
  
  if (!validation.isValid) {
    return validation;
  }

  return { isValid: true, sanitized };
}
