import { auditLogs, toIdOrNull } from './mongo';

export async function logAuditEvent(params: {
  userId?: string;
  agentId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}) {
  if (!params.userId && !params.agentId) {
    console.warn('logAuditEvent called without userId or agentId');
    return;
  }

  await auditLogs.insertOne({
    userId: toIdOrNull(params.userId),
    agentId: toIdOrNull(params.agentId),
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues ?? null,
    newValues: params.newValues ?? null,
    timestamp: new Date(),
  });
}
