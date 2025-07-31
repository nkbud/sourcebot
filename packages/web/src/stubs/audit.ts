// Stub implementation for audit functionality (EE feature removed)
import { z } from "zod";

export const auditActorSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "api_key"]),
})
export type AuditActor = z.infer<typeof auditActorSchema>;

export const auditTargetSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "org", "file", "api_key", "account_join_request", "invite"]),
})
export type AuditTarget = z.infer<typeof auditTargetSchema>;

export const auditMetadataSchema = z.object({
    message: z.string().optional(),
    api_key: z.string().optional(),
    emails: z.string().optional(), // comma separated list of emails
})
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;

export const auditEventSchema = z.object({
  action: z.string(),
  actor: auditActorSchema,
  target: auditTargetSchema,
  sourcebotVersion: z.string(),
  orgId: z.number(),
  metadata: auditMetadataSchema.optional()
})
export type AuditEvent = z.infer<typeof auditEventSchema>;

export interface IAuditService {
  createAudit(event: Omit<AuditEvent, 'sourcebotVersion'>): Promise<null>;
}

// Stub audit service that does nothing (EE feature removed)
class StubAuditService implements IAuditService {
  async createAudit(_event: Omit<AuditEvent, 'sourcebotVersion'>): Promise<null> {
    // No-op: audit functionality has been removed
    return null;
  }
}

export function getAuditService(): IAuditService {
  return new StubAuditService();
}