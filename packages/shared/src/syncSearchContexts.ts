// Stub implementation for removed ee feature
export interface SyncSearchContextsParams {
    orgId: string;
    repos: any[];
}

export const syncSearchContexts = async (params: SyncSearchContextsParams): Promise<boolean> => {
    // Enterprise feature removed - return false to indicate feature not available
    return false;
};