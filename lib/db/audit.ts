import { prisma } from './prisma';

export async function logAuditEvent(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues,
      newValues: params.newValues,
      timestamp: new Date(),
    },
  });
}