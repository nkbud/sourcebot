export async function register() {
    // Sentry instrumentation removed during telemetry cleanup
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import ('./initialize');
    }
}
