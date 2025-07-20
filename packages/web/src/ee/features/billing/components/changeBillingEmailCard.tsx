// Placeholder implementation for change billing email card
// This is a stub to resolve build issues - full implementation would be part of enterprise edition

import React from 'react';

export function ChangeBillingEmailCard() {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Billing Email</h3>
      <p className="text-muted-foreground mb-4">
        Change the email address for billing notifications.
      </p>
      <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded" disabled>
        Change Email
      </button>
    </div>
  );
}