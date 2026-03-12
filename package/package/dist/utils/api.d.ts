/**
 * API request utilities for Bitwarden Public API
 */
import type { ApiResponse } from './types.js';
/**
 * Obtains an OAuth2 access token using client credentials flow
 * Caches tokens and automatically refreshes when expired
 */
export declare function getAccessToken(): Promise<string>;
/**
 * Builds a safe API request with proper authentication and validation
 */
export declare function buildSafeApiRequest(endpoint: string, method: string, data?: unknown): Promise<RequestInit>;
/**
 * Executes a safe API request to the Bitwarden Public API
 */
export declare function executeApiRequest(endpoint: string, method: string, data?: unknown): Promise<ApiResponse>;
//# sourceMappingURL=api.d.ts.map