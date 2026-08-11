import { z } from 'zod';

/**
 * Message body.
 *
 * Plain text only, and rendered as React text nodes — no markdown, no HTML —
 * so there is nothing to sanitise and no parser to get wrong. The cap keeps a
 * single message from becoming a denial-of-service against the thread view.
 */
export const MAX_MESSAGE_LENGTH = 2000;

export const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1, 'Write something first').max(MAX_MESSAGE_LENGTH),
  })
  .strict();

/** Hard cap per conversation — see the route for why. */
export const MAX_MESSAGES_PER_CONVERSATION = 500;

export const REPORT_TARGET_TYPES = ['listing', 'user', 'message'] as const;

export const REPORT_REASONS = ['spam', 'inappropriate', 'misleading', 'scam', 'other'] as const;

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: z.string().trim().min(1).max(64),
    reason: z.enum(REPORT_REASONS),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

export const resolveReportSchema = z
  .object({
    resolution: z.string().trim().min(1).max(500),
  })
  .strict();
