import { prisma } from './prisma';

export async function logAuditEvent(params: {
  userId?: string;
  agentId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
}) {
  if (!params.userId && !params.agentId) {
    console.warn('logAuditEvent called without userId or agentId');
    return;
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      agentId: params.agentId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues,
      newValues: params.newValues,
      timestamp: new Date(),
    },
  });
}
