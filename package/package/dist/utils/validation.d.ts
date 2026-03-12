/**
 * Input validation utilities
 */
import { z } from 'zod';
/**
 * Validates input against a Zod schema and returns either the validated data or a structured error response.
 */
export declare function validateInput<T>(schema: z.ZodType<T>, args: unknown): readonly [true, T] | readonly [
    false,
    {
        readonly content: readonly [
            {
                readonly type: 'text';
                readonly text: string;
            }
        ];
        readonly isError: true;
    }
];
/**
 * Higher-order function that handles validation and executes a handler function with validated arguments.
 * This eliminates the need for every handler to duplicate validation error handling.
 *
 * @param schema - Zod schema for validation
 * @param handlerFn - Function to execute with validated arguments
 * @returns A handler function that validates input and executes the provided function
 */
export declare function withValidation<T, R>(schema: z.ZodType<T>, handlerFn: (validatedArgs: T) => Promise<R>): (args: unknown) => Promise<R>;
//# sourceMappingURL=validation.d.ts.map