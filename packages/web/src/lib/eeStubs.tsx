// Stub implementations for removed EE features

import { createLogger } from "@sourcebot/logger";
import React from "react";

const logger = createLogger('ee-stubs');

// Billing stubs
export const IS_BILLING_ENABLED = false;

export const getSubscriptionInfo = async (_domain: string) => {
    logger.warn("getSubscriptionInfo: EE billing feature removed");
    return { status: "active" }; // Stub return to avoid redirect issues
};

export const getSubscriptionBillingEmail = async (_domain: string) => {
    logger.warn("getSubscriptionBillingEmail: EE billing feature removed");
    return null;
};

// Audit stubs
export const createAuditAction = async (_action: unknown) => {
    logger.warn("createAuditAction: EE audit feature removed");
    return { success: true };
};

// Stripe stub
export const stripeClient = {
    // Minimal stub to prevent import errors
};

// Component stubs
export const SymbolHoverPopup = ({ children }: { children?: React.ReactNode }) => {
    return <>{children}</>;
};

export const ExploreMenu = () => {
    return null; // EE feature removed
};

export const AnalyticsContent = () => {
    return <div className="text-muted-foreground">Analytics feature has been removed.</div>;
};

export const AnalyticsEntitlementMessage = () => {
    return null; // EE feature removed
};

export const ChangeBillingEmailCard = () => {
    return null; // EE billing feature removed
};

export const ManageSubscriptionButton = () => {
    return null; // EE billing feature removed
};

// Stub types for removed EE features
export type SymbolDefinition = unknown;

// Stub extensions
export const symbolHoverTargetsExtension = [];