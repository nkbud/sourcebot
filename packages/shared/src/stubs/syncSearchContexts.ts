// Stub implementation for search contexts sync (EE feature removed)
import { PrismaClient } from "@sourcebot/db";
import { SearchContext } from "@sourcebot/schemas/v3/index.type";

interface SyncSearchContextsParams {
    contexts?: { [key: string]: SearchContext } | undefined;
    orgId: number;
    db: PrismaClient;
}

export const syncSearchContexts = async (_params: SyncSearchContextsParams): Promise<boolean> => {
    // No-op: search contexts sync functionality has been removed
    return false;
}