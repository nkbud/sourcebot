// Stub actions for EE features (removed)

// Stub billing actions (EE feature removed)
export const getSubscriptionInfo = async (_domain: string): Promise<any> => {
  return {
    statusCode: 404,
    errorCode: "NOT_FOUND",
    message: "Billing functionality has been removed",
  };
};

export const getSubscriptionBillingEmail = async (_domain: string): Promise<any> => {
  return {
    statusCode: 404,
    errorCode: "NOT_FOUND",
    message: "Billing functionality has been removed",
  };
};

// Stub analytics actions (EE feature removed)
export const getAnalytics = async (_domain: string): Promise<any> => {
  return {
    statusCode: 404,
    errorCode: "NOT_FOUND",
    message: "Analytics functionality has been removed",
  };
};

// Stub audit actions (EE feature removed)
export const createAuditAction = async (..._args: any[]): Promise<void> => {
  // No-op: audit functionality has been removed
  return;
};