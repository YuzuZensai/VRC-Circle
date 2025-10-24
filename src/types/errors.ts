import type { VRCError } from './bindings';

/**
 * Custom VRCError Wrapper class
 */
export class VRChatError extends Error {
  public readonly vrcError: VRCError;

  constructor(vrcError: VRCError) {
    super(getErrorMessage(vrcError));
    this.name = 'VRChatError';
    this.vrcError = vrcError;
  }

  /**
   * Get the error type
   */
  get type(): VRCError['type'] {
    return this.vrcError.type;
  }

  /**
   * Check if this is a network error
   */
  isNetwork(): boolean {
    return this.vrcError.type === 'Network';
  }

  /**
   * Check if this is an HTTP error
   */
  isHttp(): boolean {
    return this.vrcError.type === 'Http';
  }

  /**
   * Check if this is an authentication error
   */
  isAuthentication(): boolean {
    return this.vrcError.type === 'Authentication';
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimit(): boolean {
    return this.vrcError.type === 'RateLimit';
  }

  /**
   * Check if this is a parse error
   */
  isParse(): boolean {
    return this.vrcError.type === 'Parse';
  }

  /**
   * Check if this is an invalid input error
   */
  isInvalidInput(): boolean {
    return this.vrcError.type === 'InvalidInput';
  }

  /**
   * Get the HTTP status code if this is an HTTP error
   */
  getStatusCode(): number | null {
    if (this.vrcError.type === 'Http') {
      return this.vrcError.data.status;
    }
    return null;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return getUserFriendlyMessage(this.vrcError);
  }
}

/**
 * Extract error message from VRCError
 */
export function getErrorMessage(error: VRCError): string {
  switch (error.type) {
    case 'Network':
      return `Network error: ${error.data}`;
    case 'Http':
      return `HTTP ${error.data.status}: ${error.data.message}`;
    case 'Authentication':
      return `Authentication error: ${error.data}`;
    case 'RateLimit':
      return `Rate limit: ${error.data}`;
    case 'Parse':
      return `Parse error: ${error.data}`;
    case 'InvalidInput':
      return `Invalid input: ${error.data}`;
    case 'Unknown':
      return `Unknown error: ${error.data}`;
  }
}

/**
 * Get a user-friendly error message
 */
// TODO: Localize these messages later
export function getUserFriendlyMessage(error: VRCError): string {
  switch (error.type) {
    case 'Network':
      return 'Network connection error. Please check your internet connection.';
    
    case 'Http':
      const { status, message } = error.data;
      if (status === 401) {
        return 'Invalid credentials. Please check your email and password.';
      } else if (status === 403) {
        return 'Access forbidden. Your account may be restricted.';
      } else if (status === 404) {
        return 'Resource not found.';
      } else if (status === 429) {
        return 'Too many requests. Please wait a few minutes before trying again.';
      } else if (status >= 500) {
        return 'VRChat servers are experiencing issues. Please try again later.';
      }
      return message || `Server error (${status})`;
    
    case 'Authentication':
      if (error.data.toLowerCase().includes('credentials')) {
        return 'Invalid email or password.';
      } else if (error.data.toLowerCase().includes('2fa') || error.data.toLowerCase().includes('two factor')) {
        return 'Two-factor authentication required.';
      }
      return 'Authentication failed. Please try again.';
    
    case 'RateLimit':
      return 'Too many attempts. Please wait a few minutes before trying again.';
    
    case 'Parse':
      return 'Failed to process server response. Please try again.';
    
    case 'InvalidInput':
      return error.data || 'Invalid input. Please check your information.';
    
    case 'Unknown':
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Parse a Tauri error response into a VRChatError
 */
export function parseVRCError(error: unknown): VRChatError {
  // If it's already a VRChatError, return it
  if (error instanceof VRChatError) {
    return error;
  }

  // If it's a string, try to parse it as JSON
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error) as VRCError;
      return new VRChatError(parsed);
    } catch {
      // If parsing fails, treat it as an unknown error
      return new VRChatError({
        type: 'Unknown',
        data: error,
      });
    }
  }

  // If it's an object with type and data properties
  // then it's likely a VRCError
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'data' in error
  ) {
    return new VRChatError(error as VRCError);
  }

  // If it's a regular Error
  if (error instanceof Error) {
    return new VRChatError({
      type: 'Unknown',
      data: error.message,
    });
  }

  // Fallback for any other type
  return new VRChatError({
    type: 'Unknown',
    data: String(error),
  });
}
