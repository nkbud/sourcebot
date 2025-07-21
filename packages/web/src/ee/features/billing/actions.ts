// Stub for EE billing actions
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