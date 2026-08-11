-- Split the new-message email debounce marker per recipient.
--
-- M4 shipped a single `lastEmailedAt` on the conversation. That is wrong: the
-- debounce answers "have we already told THIS PERSON there's something
-- waiting", which is per-recipient. With one shared column, emailing the host
-- about a guest's message suppressed the email to the guest about the host's
-- reply — the reply silently never reached them.
--
-- Caught by a live trace of a two-way exchange before any real user saw it.
ALTER TABLE "conversations" DROP COLUMN "lastEmailedAt";
ALTER TABLE "conversations" ADD COLUMN "guestLastEmailedAt" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN "hostLastEmailedAt" TIMESTAMP(3);
