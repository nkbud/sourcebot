"use client"

import { AnalyticsContent, AnalyticsEntitlementMessage } from "@/lib/eeStubs";
import { useHasEntitlement } from "@/features/entitlements/useHasEntitlement";

export default function AnalyticsPage() {
  return <AnalyticsPageContent />;
}

function AnalyticsPageContent() {
  const hasAnalyticsEntitlement = useHasEntitlement("analytics");

  if (!hasAnalyticsEntitlement) {
    return <AnalyticsEntitlementMessage />;
  }

  return <AnalyticsContent />;
} 