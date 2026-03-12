/**
 * Organization API tool definitions for enterprise management
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const listOrgCollectionsTool: Tool;
export declare const getOrgCollectionTool: Tool;
export declare const updateOrgCollectionTool: Tool;
export declare const deleteOrgCollectionTool: Tool;
export declare const listOrgMembersTool: Tool;
export declare const getOrgMemberTool: Tool;
export declare const inviteOrgMemberTool: Tool;
export declare const updateOrgMemberTool: Tool;
export declare const removeOrgMemberTool: Tool;
export declare const listOrgGroupsTool: Tool;
export declare const getOrgGroupTool: Tool;
export declare const createOrgGroupTool: Tool;
export declare const updateOrgGroupTool: Tool;
export declare const deleteOrgGroupTool: Tool;
export declare const getOrgMemberGroupsTool: Tool;
export declare const getOrgGroupMembersTool: Tool;
export declare const updateOrgMemberGroupsTool: Tool;
export declare const reinviteOrgMemberTool: Tool;
export declare const updateOrgGroupMembersTool: Tool;
export declare const listOrgPoliciesTool: Tool;
export declare const getOrgPolicyTool: Tool;
export declare const updateOrgPolicyTool: Tool;
export declare const getOrgEventsTool: Tool;
export declare const getOrgSubscriptionTool: Tool;
export declare const updateOrgSubscriptionTool: Tool;
export declare const importOrgUsersAndGroupsTool: Tool;
export declare const organizationApiTools: {
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
//# sourceMappingURL=api.d.ts.map