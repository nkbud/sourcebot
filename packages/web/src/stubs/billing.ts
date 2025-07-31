// Stub implementation for billing functionality (EE feature removed)
import 'server-only';
import { ServiceError } from "@/lib/serviceError";
import { Prisma } from "@sourcebot/db";

// Billing is disabled (EE feature removed)
export const IS_BILLING_ENABLED = false;

export const stripeClient = undefined;

// Stub billing functions that do nothing (EE feature removed)
export const incrementOrgSeatCount = async (_orgId: number, _prisma: Prisma.TransactionClient): Promise<ServiceError | void> => {
    // No-op: billing functionality has been removed
    return;
}

export const decrementOrgSeatCount = async (_orgId: number, _prisma: Prisma.TransactionClient): Promise<ServiceError | void> => {
    // No-op: billing functionality has been removed
    return;
}

export const getSubscriptionForOrg = async (_orgId: number, _prisma: Prisma.TransactionClient): Promise<ServiceError> => {
    // Always return not found since billing is disabled
    return {
        statusCode: 404,
        errorCode: "NOT_FOUND" as any,
        message: "Billing functionality has been removed",
    };
}