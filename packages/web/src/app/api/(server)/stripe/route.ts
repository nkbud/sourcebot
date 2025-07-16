import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
// Removed - Stripe billing no longer available
// import Stripe from 'stripe';
// import { prisma } from '@/prisma';
// import { ConnectionSyncStatus, StripeSubscriptionStatus } from '@sourcebot/db';
// import { stripeClient } from '@/ee/features/billing/stripe';
// import { env } from '@/env.mjs';
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('stripe-webhook');

export async function POST(req: NextRequest) {
    // Billing functionality has been removed
    logger.warn('Stripe webhook received but billing is disabled');
    return new Response('Billing functionality is not available', { status: 503 });
}
