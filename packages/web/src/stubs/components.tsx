// Stub React components for EE features (removed)
import React from "react";

// Type definitions for EE features (removed)
export type SymbolDefinition = {
  name: string;
  fileName: string;
  repoName: string;
  range: {
    start: {
      lineNumber: number;
      column: number;
    };
    end: {
      lineNumber: number;
      column: number;
    };
  };
};

// Stub billing components (EE feature removed)
export function EnterpriseUpgradeCard() {
  return (
    <div className="text-muted-foreground text-sm">
      Enterprise upgrade functionality has been removed.
    </div>
  );
}

export function TeamUpgradeCard(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      Team upgrade functionality has been removed.
    </div>
  );
}

export function ChangeBillingEmailCard(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      Billing email functionality has been removed.
    </div>
  );
}

export function ManageSubscriptionButton(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      Subscription management has been removed.
    </div>
  );
}

// Stub SSO component and provider function (EE feature removed)
export function SSO(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      SSO functionality has been removed.
    </div>
  );
}

export function getSSOProviders() {
  // Return empty array since SSO functionality has been removed
  return [];
}

// Stub code navigation components (EE feature removed)
export function ExploreMenu(_props: Record<string, unknown>) {
  return null; // Don't show anything for code nav features
}

export function SymbolHoverPopup(_props: Record<string, unknown>) {
  return null; // Don't show anything for code nav features
}

// Stub code navigation extension (EE feature removed)
export const symbolHoverTargetsExtension = []; // Empty array for CodeMirror extensions

// Stub analytics components (EE feature removed)
export function AnalyticsContent(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      Analytics functionality has been removed.
    </div>
  );
}

export function AnalyticsEntitlementMessage(_props: Record<string, unknown>) {
  return (
    <div className="text-muted-foreground text-sm">
      Analytics entitlement functionality has been removed.
    </div>
  );
}