/**
 * Security utilities for input sanitization and validation
 */
/**
 * Sanitizes a string to prevent command injection by removing dangerous characters
 */
export declare function sanitizeInput(input: string): string;
/**
 * Validates a parameter to ensure it doesn't contain dangerous patterns
 * Used as an additional safety check before passing to spawn()
 */
export declare function validateParameter(value: string): boolean;
/**
 * Builds a safe Bitwarden CLI command array for use with spawn()
 * Returns an array of [baseCommand, ...parameters] for safe execution
 */
export declare function buildSafeCommand(baseCommand: string, parameters?: readonly string[]): readonly [string, ...string[]];
/**
 * Validates that a command is safe and contains only allowed Bitwarden CLI commands
 */
export declare function isValidBitwardenCommand(command: string): boolean;
/**
 * Validates that an API endpoint path is safe and matches allowed patterns
 */
export declare function validateApiEndpoint(endpoint: string): boolean;
/**
 * Sanitizes API parameters to prevent injection attacks
 */
export declare function sanitizeApiParameters(params: unknown): unknown;
/**
 * Validates file paths to prevent path traversal attacks
 * Uses allowlist-based validation with comprehensive security checks
 *
 * Security measures:
 * - URL decoding (iterative to handle double encoding)
 * - Unicode normalization (NFC form)
 * - Path resolution to canonical form
 * - Allowlist-based directory validation
 * - Protection against all known bypass techniques
 *
 * Configuration:
 * Set BW_ALLOWED_DIRECTORIES environment variable to a comma-separated list
 * of allowed directories. If not set, defaults to system temp directory.
 *
 * Example: BW_ALLOWED_DIRECTORIES=/tmp/bitwarden,/home/user/downloads
 */
export declare function validateFilePath(filePath: string): boolean;
//# sourceMappingURL=security.d.ts.map