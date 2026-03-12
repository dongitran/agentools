/**
 * CLI tool definitions for personal vault operations
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const lockTool: Tool;
export declare const syncTool: Tool;
export declare const statusTool: Tool;
export declare const listTool: Tool;
export declare const getTool: Tool;
export declare const generateTool: Tool;
export declare const createItemTool: Tool;
export declare const createFolderTool: Tool;
export declare const editItemTool: Tool;
export declare const editFolderTool: Tool;
export declare const deleteTool: Tool;
export declare const confirmTool: Tool;
export declare const createOrgCollectionTool: Tool;
export declare const editOrgCollectionTool: Tool;
export declare const editItemCollectionsTool: Tool;
export declare const moveTool: Tool;
export declare const deviceApprovalListTool: Tool;
export declare const deviceApprovalApproveTool: Tool;
export declare const deviceApprovalApproveAllTool: Tool;
export declare const deviceApprovalDenyTool: Tool;
export declare const deviceApprovalDenyAllTool: Tool;
export declare const restoreTool: Tool;
export declare const createTextSendTool: Tool;
export declare const createFileSendTool: Tool;
export declare const listSendTool: Tool;
export declare const getSendTool: Tool;
export declare const editSendTool: Tool;
export declare const deleteSendTool: Tool;
export declare const removeSendPasswordTool: Tool;
export declare const createAttachmentTool: Tool;
export declare const cliTools: {
    inputSchema: {
        [x: string]: unknown;
        type: "object";
        properties?: {
            [x: string]: object;
        } | undefined;
        required?: string[] | undefined;
    };
    name: string;
    description?: string | undefined;
    outputSchema?: {
        [x: string]: unknown;
        type: "object";
        properties?: {
            [x: string]: object;
        } | undefined;
        required?: string[] | undefined;
    } | undefined;
    annotations?: {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
    } | undefined;
    execution?: {
        taskSupport?: "optional" | "required" | "forbidden" | undefined;
    } | undefined;
    _meta?: {
        [x: string]: unknown;
    } | undefined;
    icons?: {
        src: string;
        mimeType?: string | undefined;
        sizes?: string[] | undefined;
        theme?: "light" | "dark" | undefined;
    }[] | undefined;
    title?: string | undefined;
}[];
//# sourceMappingURL=cli.d.ts.map