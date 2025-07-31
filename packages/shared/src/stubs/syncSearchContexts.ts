// Stub implementation for search contexts sync (EE feature removed)

interface SyncSearchContextsParams {
    contexts?: { [key: string]: any } | undefined;
    orgId: number;
    db: any;
}

export const syncSearchContexts = async (_params: SyncSearchContextsParams): Promise<boolean> => {
    // No-op: search contexts sync functionality has been removed
    return false;
}