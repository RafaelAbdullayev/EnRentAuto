import { prisma } from '@/lib/prisma';

/**
 * Журналирование действий администратора.
 * Никогда не роняет основной запрос — ошибки логирования проглатываются.
 */
export async function logAction(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        meta: (params.meta ?? {}) as object,
      },
    });
  } catch (error) {
    console.error('[audit] не удалось записать лог:', error);
  }
}
