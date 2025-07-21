// Telemetry hook stub - replaced after EE cleanup
export default function useCaptureEvent() {
    return function captureEvent(event: string, _properties: Record<string, unknown> = {}) {
        // Stub implementation - no-op after analytics cleanup
        // Previously sent telemetry data but removed for privacy
    };
}