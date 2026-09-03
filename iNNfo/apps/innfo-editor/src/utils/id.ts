/**
 * Generates a unique identifier. Single source for all ID generation.
 */
export const generateId = (): string => crypto.randomUUID()
