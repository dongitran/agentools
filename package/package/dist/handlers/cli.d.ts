/**
 * CLI command handlers for personal vault operations
 */
export declare const handleLock: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleSync: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleStatus: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleList: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleGet: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleGenerate: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateItem: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateFolder: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleEditItem: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleEditFolder: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleDelete: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleConfirm: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateOrgCollection: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleEditOrgCollection: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleEditItemCollections: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles moving (sharing) a vault item to an organization.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleMove: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles listing pending device approval requests for an organization.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleDeviceApprovalList: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles approving a pending device authorization request.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleDeviceApprovalApprove: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles approving all pending device authorization requests.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleDeviceApprovalApproveAll: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles denying a pending device authorization request.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleDeviceApprovalDeny: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
/**
 * Handles denying all pending device authorization requests.
 *
 * @param {Record<string, unknown>} args - Arguments from the tool call.
 * @returns {Promise<McpResponse>} Promise resolving to the formatted result.
 */
export declare const handleDeviceApprovalDenyAll: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleRestore: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateTextSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateFileSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleListSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleGetSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleEditSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleDeleteSend: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleRemoveSendPassword: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const handleCreateAttachment: (args: unknown) => Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=cli.d.ts.map