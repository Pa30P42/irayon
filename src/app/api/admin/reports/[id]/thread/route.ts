import { recordAdminLog } from '@/lib/admin-log';
import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/reports/:id/thread — read the conversation behind a reported
 * message.
 *
 * **This is the one place an admin can read private correspondence.** That is
 * necessary for moderation and it must never be silent: every call writes an
 * AdminLog entry naming the admin and the conversation, BEFORE the content is
 * returned.
 *
 * The log write is awaited rather than deferred to `after()`. `after()` is
 * best-effort — a failure there would mean the messages were read and no record
 * exists, which is exactly the outcome this endpoint is designed to prevent. If
 * the audit trail can't be written, the content isn't served.
 *
 * A POST rather than a GET so the act of reading is a deliberate, non-idempotent
 * step that a prefetch or a crawler can't perform by accident.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      select: { targetType: true, targetId: true },
    });
    if (!report || report.targetType !== 'message') return apiNotFound('Not found');

    const message = await prisma.message.findUnique({
      where: { id: report.targetId },
      select: { conversationId: true },
    });
    // The message may have cascaded away with its booking — a normal outcome,
    // and the report stays resolvable without it.
    if (!message) return apiNotFound('Content no longer available');

    // AWAITED, and before the read. No log, no content.
    await recordAdminLog({
      actor: auth.user,
      action: 'report.thread.read',
      target: id,
      metadata: { conversationId: message.conversationId, messageId: report.targetId },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: message.conversationId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return apiOk({
      conversationId: message.conversationId,
      reportedMessageId: report.targetId,
      data: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender.name ?? m.sender.email,
      })),
    });
  } catch (err) {
    logger.error(`POST /api/admin/reports/${id}/thread failed`, { err });
    return apiServerError();
  }
}
