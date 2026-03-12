/**
 * API request utilities for Bitwarden Public API
 */
import { API_BASE_URL, IDENTITY_URL, CLIENT_ID, CLIENT_SECRET, } from './config.js';
import { validateApiEndpoint, sanitizeApiParameters } from './security.js';
let cachedToken = null;
let tokenExpiry = 0;
/**
 * Obtains an OAuth2 access token using client credentials flow
 * Caches tokens and automatically refreshes when expired
 */
export async function getAccessToken() {
    const now = Date.now();
    // Return cached token if still valid (with 5 minute buffer)
    if (cachedToken && now < tokenExpiry - 300000) {
        return cachedToken;
    }
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('BW_CLIENT_ID and BW_CLIENT_SECRET environment variables are required for API operations');
    }
    try {
        const response = await fetch(`${IDENTITY_URL}/connect/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'api.organization',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
        });
        if (!response.ok) {
            throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
        }
        const tokenData = (await response.json());
        cachedToken = tokenData.access_token;
        tokenExpiry = now + tokenData.expires_in * 1000; // Convert seconds to milliseconds
        return cachedToken;
    }
    catch (error) {
        throw new Error(`Failed to obtain access token: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Builds a safe API request with proper authentication and validation
 */
export async function buildSafeApiRequest(endpoint, method, data) {
    if (!validateApiEndpoint(endpoint)) {
        throw new Error(`Invalid API endpoint: ${endpoint}`);
    }
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    const upperMethod = method.toUpperCase();
    if (!allowedMethods.includes(upperMethod)) {
        throw new Error(`Invalid HTTP method: ${method}`);
    }
    const token = await getAccessToken();
    const sanitizedData = data ? sanitizeApiParameters(data) : undefined;
    const requestConfig = {
        method: upperMethod,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Bitwarden-MCP-Server/2026.1.0',
        },
    };
    if (sanitizedData && (upperMethod === 'POST' || upperMethod === 'PUT')) {
        requestConfig.body = JSON.stringify(sanitizedData);
    }
    return requestConfig;
}
/**
 * Executes a safe API request to the Bitwarden Public API
 */
export async function executeApiRequest(endpoint, method, data) {
    try {
        const requestConfig = await buildSafeApiRequest(endpoint, method, data);
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, requestConfig);
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                responseData = (await response.json());
            }
            catch (error) {
                // If JSON parsing fails, create a simple error message
                responseData = `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`;
            }
        }
        else {
            responseData = await response.text();
        }
        if (!response.ok) {
            return {
                status: response.status,
                errorMessage: `API request failed: ${response.status} ${response.statusText}`,
                data: responseData,
            };
        }
        return {
            status: response.status,
            data: responseData,
        };
    }
    catch (error) {
        return {
            status: 500,
            errorMessage: `API request error: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
//# sourceMappingURL=api.js.map