// Stub implementation for removed public access feature

export const getPublicAccessStatus = async (_domain: string): Promise<boolean> => {
    // Enterprise feature removed - return false to indicate public access is disabled
    return false;
};

export const setPublicAccessStatus = async (_domain: string, _enabled: boolean): Promise<void> => {
    // Enterprise feature removed - no-op
};

export const createGuestUser = async (): Promise<unknown> => {
    // Enterprise feature removed - return null
    return null;
};