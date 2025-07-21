// Placeholder implementation for team upgrade card
// This is a stub to resolve build issues - full implementation would be part of enterprise edition

import React from 'react';

export function TeamUpgradeCard() {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Team Plan</h3>
      <p className="text-muted-foreground mb-4">
        Upgrade to Team plan for collaboration features.
      </p>
      <button className="px-4 py-2 bg-primary text-primary-foreground rounded" disabled>
        Upgrade to Team
      </button>
    </div>
  );
}
