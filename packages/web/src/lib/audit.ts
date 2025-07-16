// Stub implementations for removed audit feature

export interface AuditEvent {
    action: string;
    actor: {
        id: string;
        type: string;
    };
    target: {
        id: string;
        type: string;
    };
    orgId: string;
    metadata?: Record<string, unknown>;
}

export interface IAuditService {
    createAudit(event: AuditEvent): Promise<void>;
}

class NoOpAuditService implements IAuditService {
    async createAudit(_event: AuditEvent): Promise<void> {
        // Enterprise feature removed - no-op
    }
}

export const getAuditService = (): IAuditService => {
    return new NoOpAuditService();
};

export const createAuditAction = async (_event: AuditEvent, _domain?: string): Promise<void> => {
    // Enterprise feature removed - no-op
};