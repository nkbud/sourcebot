// Placeholder implementation for billing actions
// This is a stub to resolve build issues - full implementation would be part of enterprise edition

'use server';

export async function getBillingInfo() {
  // Stub implementation
  return null;
}

export async function updateBillingEmail() {
  // Stub implementation
  return { success: false, message: 'Enterprise feature not available' };
}

export async function cancelSubscription() {
  // Stub implementation
  return { success: false, message: 'Enterprise feature not available' };
}

export const getSubscriptionInfo = async () => {
  return {
    status: 'inactive',
    plan: 'free',
    seats: 0,
    seatsUsed: 0,
  };
};

export const getSubscriptionBillingEmail = async () => {
  return null;
}; 
