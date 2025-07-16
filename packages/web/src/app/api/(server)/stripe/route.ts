
export async function POST() {
    // Stripe billing feature removed
    return new Response('Billing feature not available', { status: 404 });
}