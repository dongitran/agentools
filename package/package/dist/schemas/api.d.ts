/**
 * Zod validation schemas for Organization API operations
 * Based on official Bitwarden Public API specification
 *
 * Note: Collection creation is NOT supported by the Public API.
 * The Public API only supports: list, get, update, and delete operations for collections.
 */
import { z } from 'zod';
export declare const listCollectionsRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const getCollectionRequestSchema: z.ZodObject<{
    collectionId: z.ZodString;
}, z.core.$strip>;
export declare const updateCollectionRequestSchema: z.ZodObject<{
    collectionId: z.ZodString;
    externalId: z.ZodOptional<z.ZodString>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodBoolean;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
        manage: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const deleteCollectionRequestSchema: z.ZodObject<{
    collectionId: z.ZodString;
}, z.core.$strip>;
export declare const listMembersRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const getMemberRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
}, z.core.$strip>;
export declare const inviteMemberRequestSchema: z.ZodObject<{
    email: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<4>]>;
    externalId: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodObject<{
        accessEventLogs: z.ZodOptional<z.ZodBoolean>;
        accessImportExport: z.ZodOptional<z.ZodBoolean>;
        accessReports: z.ZodOptional<z.ZodBoolean>;
        createNewCollections: z.ZodOptional<z.ZodBoolean>;
        editAnyCollection: z.ZodOptional<z.ZodBoolean>;
        deleteAnyCollection: z.ZodOptional<z.ZodBoolean>;
        manageGroups: z.ZodOptional<z.ZodBoolean>;
        managePolicies: z.ZodOptional<z.ZodBoolean>;
        manageSso: z.ZodOptional<z.ZodBoolean>;
        manageUsers: z.ZodOptional<z.ZodBoolean>;
        manageResetPassword: z.ZodOptional<z.ZodBoolean>;
        manageScim: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    collections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
        manage: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    groups: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const updateMemberRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<4>]>;
    externalId: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodObject<{
        accessEventLogs: z.ZodOptional<z.ZodBoolean>;
        accessImportExport: z.ZodOptional<z.ZodBoolean>;
        accessReports: z.ZodOptional<z.ZodBoolean>;
        createNewCollections: z.ZodOptional<z.ZodBoolean>;
        editAnyCollection: z.ZodOptional<z.ZodBoolean>;
        deleteAnyCollection: z.ZodOptional<z.ZodBoolean>;
        manageGroups: z.ZodOptional<z.ZodBoolean>;
        managePolicies: z.ZodOptional<z.ZodBoolean>;
        manageSso: z.ZodOptional<z.ZodBoolean>;
        manageUsers: z.ZodOptional<z.ZodBoolean>;
        manageResetPassword: z.ZodOptional<z.ZodBoolean>;
        manageScim: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    collections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
        manage: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    groups: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const removeMemberRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
}, z.core.$strip>;
export declare const listGroupsRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const getGroupRequestSchema: z.ZodObject<{
    groupId: z.ZodString;
}, z.core.$strip>;
export declare const createGroupRequestSchema: z.ZodObject<{
    name: z.ZodString;
    externalId: z.ZodOptional<z.ZodString>;
    collections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
        manage: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const updateGroupRequestSchema: z.ZodObject<{
    groupId: z.ZodString;
    name: z.ZodString;
    externalId: z.ZodOptional<z.ZodString>;
    collections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
        manage: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const deleteGroupRequestSchema: z.ZodObject<{
    groupId: z.ZodString;
}, z.core.$strip>;
export declare const getMemberGroupsRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
}, z.core.$strip>;
export declare const getGroupMembersRequestSchema: z.ZodObject<{
    groupId: z.ZodString;
}, z.core.$strip>;
export declare const updateMemberGroupsRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
    groupIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const updateGroupMembersRequestSchema: z.ZodObject<{
    groupId: z.ZodString;
    memberIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const reinviteMemberRequestSchema: z.ZodObject<{
    memberId: z.ZodString;
}, z.core.$strip>;
export declare const listPoliciesRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const getPolicyRequestSchema: z.ZodObject<{
    policyType: z.ZodNumber;
}, z.core.$strip>;
export declare const updatePolicyRequestSchema: z.ZodObject<{
    policyType: z.ZodNumber;
    enabled: z.ZodBoolean;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const getEventsRequestSchema: z.ZodObject<{
    start: z.ZodString;
    end: z.ZodString;
    actingUserId: z.ZodOptional<z.ZodString>;
    itemId: z.ZodOptional<z.ZodString>;
    collectionId: z.ZodOptional<z.ZodString>;
    groupId: z.ZodOptional<z.ZodString>;
    policyId: z.ZodOptional<z.ZodString>;
    memberId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const getOrgSubscriptionRequestSchema: z.ZodObject<{}, z.core.$strip>;
export declare const updateOrgSubscriptionRequestSchema: z.ZodObject<{
    passwordManager: z.ZodOptional<z.ZodObject<{
        seats: z.ZodOptional<z.ZodNumber>;
        storage: z.ZodOptional<z.ZodNumber>;
        maxAutoScaleSeats: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    secretsManager: z.ZodOptional<z.ZodObject<{
        seats: z.ZodOptional<z.ZodNumber>;
        maxAutoScaleSeats: z.ZodOptional<z.ZodNumber>;
        serviceAccounts: z.ZodOptional<z.ZodNumber>;
        maxAutoScaleServiceAccounts: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const importOrganizationUsersAndGroupsRequestSchema: z.ZodObject<{
    groups: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        externalId: z.ZodString;
        memberExternalIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>>;
    members: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        externalId: z.ZodString;
        deleted: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>>>>;
    overwriteExisting: z.ZodBoolean;
    largeImport: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
//# sourceMappingURL=api.d.ts.map