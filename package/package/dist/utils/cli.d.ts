/**
 * CLI command execution utilities
 */
import type { CliResponse } from './types.js';
/**
 * Executes a Bitwarden CLI command safely using spawn() to prevent command injection
 * Internally calls buildSafeCommand() to validate and sanitize inputs
 * @param baseCommand - The base Bitwarden command (e.g., 'list', 'get', 'create')
 * @param parameters - Array of command parameters (will be validated)
 * @returns Promise resolving to CLI response with output or error
 */
export declare function executeCliCommand(baseCommand: string, parameters?: readonly string[]): Promise<CliResponse>;
//# sourceMappingURL=cli.d.ts.map