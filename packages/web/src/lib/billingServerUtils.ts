// Stub implementations for removed billing server utilities

export interface SubscriptionResult {
    success: boolean;
    error?: string;
}

export interface SubscriptionInfo {
    status: string;
    plan: string;
    seats: number;
}

export const getSubscriptionForOrg = async (_orgId: string, _prisma: unknown): Promise<SubscriptionResult> => {
    // Enterprise feature removed - return success to avoid blocking functionality
    return { success: true };
};

export const incrementOrgSeatCount = async (_orgId: string, _tx: unknown): Promise<SubscriptionResult> => {
    // Enterprise feature removed - return success to avoid blocking functionality
    return { success: true };
};

export const decrementOrgSeatCount = async (_orgId: string, _tx: unknown): Promise<SubscriptionResult> => {
    // Enterprise feature removed - return success to avoid blocking functionality
    return { success: true };
};

export const getSubscriptionInfo = async (_domain: string): Promise<SubscriptionInfo | null> => {
    // Enterprise feature removed - return null to indicate no subscription
    return null;
};

export const getSubscriptionBillingEmail = async (_domain: string): Promise<string | null> => {
    // Enterprise feature removed - return null
    return null;
};