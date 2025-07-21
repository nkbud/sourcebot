// Placeholder implementation for enterprise upgrade card
// This is a stub to resolve build issues - full implementation would be part of enterprise edition

import React from 'react';

export function EnterpriseUpgradeCard() {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Enterprise Edition</h3>
      <p className="text-muted-foreground mb-4">
        Upgrade to Enterprise for advanced features and support.
      </p>
      <button className="px-4 py-2 bg-primary text-primary-foreground rounded" disabled>
        Contact Sales
      </button>
    </div>
  );
}