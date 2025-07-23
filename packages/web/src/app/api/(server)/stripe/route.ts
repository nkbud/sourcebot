import { NextRequest } from 'next/server';
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('stripe-webhook-stub');

export async function POST(_req: NextRequest) {
    logger.warn('Stripe webhook functionality has been removed (EE feature)');
    return new Response('Stripe functionality has been removed', { status: 404 });
}
