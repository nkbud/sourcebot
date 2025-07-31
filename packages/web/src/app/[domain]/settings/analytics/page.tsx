"use client"

import { AnalyticsContent } from "@/stubs/components";
import { AnalyticsEntitlementMessage } from "@/stubs/components";
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