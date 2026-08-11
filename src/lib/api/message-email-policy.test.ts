import { describe, expect, it } from 'vitest';
import { decideMessageEmail, type EmailDecisionInput } from './message-email-policy';

const t = (seconds: number) => new Date(`2026-08-11T12:00:${String(seconds).padStart(2, '0')}Z`);

const input = (overrides: Partial<EmailDecisionInput>): EmailDecisionInput => ({
  senderRole: 'guest',
  lastMessageAt: t(10),
  guestLastReadAt: null,
  hostLastReadAt: null,
  guestLastEmailedAt: null,
  hostLastEmailedAt: null,
  ...overrides,
});

describe('decideMessageEmail', () => {
  it('sends the first email of a thread', () => {
    expect(decideMessageEmail(input({}))).toEqual({ send: true });
  });

  it('sends nothing when there are no messages', () => {
    expect(decideMessageEmail(input({ lastMessageAt: null }))).toEqual({
      send: false,
      reason: 'no-messages',
    });
  });

  it('stays quiet when the recipient is already caught up', () => {
    // They've read past the newest message — they're looking at the thread.
    expect(
      decideMessageEmail(
        input({ senderRole: 'guest', lastMessageAt: t(10), hostLastReadAt: t(10) }),
      ),
    ).toEqual({ send: false, reason: 'recipient-caught-up' });
  });

  it('debounces a burst into a single email', () => {
    // Host was emailed at :11 about a stretch that began at their :05 cursor.
    // Every later message in that stretch adds nothing.
    const state = input({
      senderRole: 'guest',
      lastMessageAt: t(30),
      hostLastReadAt: t(5),
      hostLastEmailedAt: t(11),
    });
    expect(decideMessageEmail(state)).toEqual({ send: false, reason: 'already-emailed' });
  });

  it('emails again once the recipient has read and a new message arrives', () => {
    // Read cursor (:20) is now past the last email (:11) — fresh stretch.
    expect(
      decideMessageEmail(
        input({
          senderRole: 'guest',
          lastMessageAt: t(30),
          hostLastReadAt: t(20),
          hostLastEmailedAt: t(11),
        }),
      ),
    ).toEqual({ send: true });
  });

  /**
   * THE REGRESSION. The first implementation used one shared `lastEmailedAt`
   * for the whole conversation, so emailing the host about the guest's message
   * suppressed the email to the guest about the host's reply — the reply
   * silently never reached them.
   *
   * Caught by a live trace of a two-way exchange; pinned here so it can't
   * return.
   */
  it('does not let an email to one side suppress the email to the other', () => {
    // Guest wrote at :05 (host emailed at :06). Host replies at :10.
    // The guest has NEVER been emailed, so they must be.
    const hostReplying = input({
      senderRole: 'host',
      lastMessageAt: t(10),
      // The guest's cursor sits at their own message.
      guestLastReadAt: t(5),
      guestLastEmailedAt: null,
      // The host was emailed moments ago — irrelevant to the guest's email.
      hostLastEmailedAt: t(6),
      hostLastReadAt: t(10),
    });
    expect(decideMessageEmail(hostReplying)).toEqual({ send: true });
  });

  it('reads the correct cursor for each direction', () => {
    // Guest sends → only the HOST's cursors matter.
    expect(
      decideMessageEmail(
        input({
          senderRole: 'guest',
          lastMessageAt: t(10),
          hostLastReadAt: t(10), // caught up
          guestLastReadAt: null, // irrelevant
        }),
      ).send,
    ).toBe(false);

    // Host sends → only the GUEST's cursors matter.
    expect(
      decideMessageEmail(
        input({
          senderRole: 'host',
          lastMessageAt: t(10),
          hostLastReadAt: t(10), // irrelevant
          guestLastReadAt: null,
        }),
      ).send,
    ).toBe(true);
  });

  it('treats an equal read timestamp as caught up', () => {
    expect(
      decideMessageEmail(
        input({ senderRole: 'host', lastMessageAt: t(10), guestLastReadAt: t(10) }),
      ).send,
    ).toBe(false);
  });

  it('emails when the recipient has never read and never been emailed', () => {
    expect(
      decideMessageEmail(
        input({ senderRole: 'host', lastMessageAt: t(10), guestLastReadAt: null }),
      ),
    ).toEqual({ send: true });
  });

  it('stays quiet when never read but already emailed', () => {
    // No cursor at all, but we've already told them — don't tell them twice.
    expect(
      decideMessageEmail(
        input({
          senderRole: 'host',
          lastMessageAt: t(30),
          guestLastReadAt: null,
          guestLastEmailedAt: t(11),
        }),
      ),
    ).toEqual({ send: false, reason: 'already-emailed' });
  });
});
