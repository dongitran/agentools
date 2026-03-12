/**
 * Zod validation schemas for CLI operations
 * Handles validation for personal vault operations using the Bitwarden CLI
 *
 * Features:
 * - Vault locking/unlocking operations
 * - Item listing, retrieval, and management
 * - Password generation and secure operations
 * - Folder and item creation/editing/deletion
 */
import { z } from 'zod';
export declare const lockSchema: z.ZodObject<{}, z.core.$strip>;
export declare const syncSchema: z.ZodObject<{}, z.core.$strip>;
export declare const statusSchema: z.ZodObject<{}, z.core.$strip>;
export declare const listSchema: z.ZodObject<{
    type: z.ZodEnum<{
        items: "items";
        folders: "folders";
        collections: "collections";
        organizations: "organizations";
        "org-collections": "org-collections";
        "org-members": "org-members";
    }>;
    search: z.ZodOptional<z.ZodString>;
    organizationid: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    folderid: z.ZodOptional<z.ZodString>;
    collectionid: z.ZodOptional<z.ZodString>;
    trash: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const getSchema: z.ZodObject<{
    object: z.ZodEnum<{
        item: "item";
        username: "username";
        password: "password";
        uri: "uri";
        totp: "totp";
        notes: "notes";
        exposed: "exposed";
        attachment: "attachment";
        folder: "folder";
        collection: "collection";
        organization: "organization";
        "org-collection": "org-collection";
        fingerprint: "fingerprint";
    }>;
    id: z.ZodString;
    organizationid: z.ZodOptional<z.ZodString>;
    itemid: z.ZodOptional<z.ZodString>;
    output: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const generateSchema: z.ZodObject<{
    length: z.ZodOptional<z.ZodNumber>;
    uppercase: z.ZodOptional<z.ZodBoolean>;
    lowercase: z.ZodOptional<z.ZodBoolean>;
    number: z.ZodOptional<z.ZodBoolean>;
    special: z.ZodOptional<z.ZodBoolean>;
    passphrase: z.ZodOptional<z.ZodBoolean>;
    words: z.ZodOptional<z.ZodNumber>;
    separator: z.ZodOptional<z.ZodString>;
    capitalize: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const uriSchema: z.ZodObject<{
    uri: z.ZodString;
    match: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    uris: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        match: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>;
    }, z.core.$strip>>>;
    totp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const cardSchema: z.ZodObject<{
    cardholderName: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    expMonth: z.ZodOptional<z.ZodString>;
    expYear: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const identitySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    address1: z.ZodOptional<z.ZodString>;
    address2: z.ZodOptional<z.ZodString>;
    address3: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    company: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    ssn: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    passportNumber: z.ZodOptional<z.ZodString>;
    licenseNumber: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const secureNoteSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<0>>;
}, z.core.$strip>;
export declare const createItemSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    notes: z.ZodOptional<z.ZodString>;
    login: z.ZodOptional<z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        uris: z.ZodOptional<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            match: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>;
        }, z.core.$strip>>>;
        totp: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    card: z.ZodOptional<z.ZodObject<{
        cardholderName: z.ZodOptional<z.ZodString>;
        number: z.ZodOptional<z.ZodString>;
        brand: z.ZodOptional<z.ZodString>;
        expMonth: z.ZodOptional<z.ZodString>;
        expYear: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    identity: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        middleName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        address1: z.ZodOptional<z.ZodString>;
        address2: z.ZodOptional<z.ZodString>;
        address3: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        company: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        ssn: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        passportNumber: z.ZodOptional<z.ZodString>;
        licenseNumber: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    secureNote: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<0>>;
    }, z.core.$strip>>;
    folderId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createFolderSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export declare const editLoginSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    uris: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        match: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>;
    }, z.core.$strip>>>;
    totp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const editCardSchema: z.ZodObject<{
    cardholderName: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    expMonth: z.ZodOptional<z.ZodString>;
    expYear: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const editIdentitySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    address1: z.ZodOptional<z.ZodString>;
    address2: z.ZodOptional<z.ZodString>;
    address3: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    company: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    ssn: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    passportNumber: z.ZodOptional<z.ZodString>;
    licenseNumber: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const editSecureNoteSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<0>>;
}, z.core.$strip>;
export declare const editItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    login: z.ZodOptional<z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        uris: z.ZodOptional<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            match: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>]>>;
        }, z.core.$strip>>>;
        totp: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    card: z.ZodOptional<z.ZodObject<{
        cardholderName: z.ZodOptional<z.ZodString>;
        number: z.ZodOptional<z.ZodString>;
        brand: z.ZodOptional<z.ZodString>;
        expMonth: z.ZodOptional<z.ZodString>;
        expYear: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    identity: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        middleName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        address1: z.ZodOptional<z.ZodString>;
        address2: z.ZodOptional<z.ZodString>;
        address3: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        company: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        ssn: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        passportNumber: z.ZodOptional<z.ZodString>;
        licenseNumber: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    secureNote: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<0>>;
    }, z.core.$strip>>;
    folderId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const editFolderSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const deleteSchema: z.ZodObject<{
    object: z.ZodEnum<{
        item: "item";
        attachment: "attachment";
        folder: "folder";
        "org-collection": "org-collection";
    }>;
    id: z.ZodString;
    permanent: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const confirmSchema: z.ZodObject<{
    organizationId: z.ZodString;
    memberId: z.ZodString;
}, z.core.$strip>;
export declare const createOrgCollectionSchema: z.ZodObject<{
    organizationId: z.ZodString;
    name: z.ZodString;
    externalId: z.ZodOptional<z.ZodString>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const editOrgCollectionSchema: z.ZodObject<{
    organizationId: z.ZodString;
    collectionId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    externalId: z.ZodOptional<z.ZodString>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        hidePasswords: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const editItemCollectionsSchema: z.ZodObject<{
    itemId: z.ZodString;
    organizationId: z.ZodString;
    collectionIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const moveSchema: z.ZodObject<{
    itemId: z.ZodString;
    organizationId: z.ZodString;
    collectionIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const deviceApprovalListSchema: z.ZodObject<{
    organizationId: z.ZodString;
}, z.core.$strip>;
export declare const deviceApprovalApproveSchema: z.ZodObject<{
    organizationId: z.ZodString;
    requestId: z.ZodString;
}, z.core.$strip>;
export declare const deviceApprovalApproveAllSchema: z.ZodObject<{
    organizationId: z.ZodString;
}, z.core.$strip>;
export declare const deviceApprovalDenySchema: z.ZodObject<{
    organizationId: z.ZodString;
    requestId: z.ZodString;
}, z.core.$strip>;
export declare const deviceApprovalDenyAllSchema: z.ZodObject<{
    organizationId: z.ZodString;
}, z.core.$strip>;
export declare const restoreSchema: z.ZodObject<{
    object: z.ZodEnum<{
        item: "item";
    }>;
    id: z.ZodString;
}, z.core.$strip>;
export declare const createTextSendSchema: z.ZodPipe<z.ZodObject<{
    name: z.ZodString;
    text: z.ZodString;
    hidden: z.ZodOptional<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    maxAccessCount: z.ZodOptional<z.ZodNumber>;
    expirationDate: z.ZodOptional<z.ZodString>;
    deletionDate: z.ZodOptional<z.ZodString>;
    disabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    deletionDate: string;
    name: string;
    text: string;
    disabled: boolean;
    hidden?: boolean | undefined;
    notes?: string | undefined;
    password?: string | undefined;
    maxAccessCount?: number | undefined;
    expirationDate?: string | undefined;
}, {
    name: string;
    text: string;
    disabled: boolean;
    hidden?: boolean | undefined;
    notes?: string | undefined;
    password?: string | undefined;
    maxAccessCount?: number | undefined;
    expirationDate?: string | undefined;
    deletionDate?: string | undefined;
}>>;
export declare const createFileSendSchema: z.ZodPipe<z.ZodObject<{
    name: z.ZodString;
    filePath: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    maxAccessCount: z.ZodOptional<z.ZodNumber>;
    expirationDate: z.ZodOptional<z.ZodString>;
    deletionDate: z.ZodOptional<z.ZodString>;
    disabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    deletionDate: string;
    name: string;
    filePath: string;
    disabled: boolean;
    notes?: string | undefined;
    password?: string | undefined;
    maxAccessCount?: number | undefined;
    expirationDate?: string | undefined;
}, {
    name: string;
    filePath: string;
    disabled: boolean;
    notes?: string | undefined;
    password?: string | undefined;
    maxAccessCount?: number | undefined;
    expirationDate?: string | undefined;
    deletionDate?: string | undefined;
}>>;
export declare const listSendSchema: z.ZodObject<{}, z.core.$strip>;
export declare const getSendSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const editSendSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    maxAccessCount: z.ZodOptional<z.ZodNumber>;
    expirationDate: z.ZodOptional<z.ZodString>;
    deletionDate: z.ZodOptional<z.ZodString>;
    disabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const deleteSendSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const removeSendPasswordSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createAttachmentSchema: z.ZodObject<{
    filePath: z.ZodString;
    itemId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=cli.d.ts.map