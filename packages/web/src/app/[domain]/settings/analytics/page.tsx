"use client"

// Removed - Enterprise analytics components no longer available
// import { AnalyticsContent } from "@/ee/features/analytics/analyticsContent";
// import { AnalyticsEntitlementMessage } from "@/ee/features/analytics/analyticsEntitlementMessage";
import { useHasEntitlement } from "@/features/entitlements/useHasEntitlement";

export default function AnalyticsPage() {
  return <AnalyticsPageContent />;
}

function AnalyticsPageContent() {
  const hasAnalyticsEntitlement = useHasEntitlement("analytics");

  // Analytics feature removed - always show disabled message
  return (
    <div className="text-center text-muted-foreground p-8">
      <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
      <p>Analytics features have been removed from this version.</p>
    </div>
  );
} 