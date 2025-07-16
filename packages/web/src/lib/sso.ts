// Stub implementation for removed SSO feature

export const getSSOProviders = () => {
    // Enterprise feature removed - return empty array
    return [];
};

export const handleJITProvisioning = async (_userId: string, _domain: string): Promise<unknown> => {
    // Enterprise feature removed - return null to indicate no provisioning
    return null;
};