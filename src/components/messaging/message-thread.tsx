'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMarkRead, useMessages, useSendMessage } from '@/hooks/use-messages';
import { MAX_MESSAGE_LENGTH } from '@/lib/api/messaging-validator';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export function MessageThread({ conversationId }: { conversationId: string }) {
  const t = useTranslations('messages');
  const { data: messages = [], isPending } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;

  const latestId = messages[messages.length - 1]?.id;

  // Mark read whenever the newest message changes — opening the thread, and
  // again each time one arrives while it's open. Keyed on the id rather than
  // the array so a poll returning identical data doesn't re-fire the write.
  useEffect(() => {
    if (latestId) markReadRef.current();
  }, [latestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [latestId]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    send.mutate(trimmed, {
      onSuccess: () => setBody(''),
      onError: (err) =>
        setError(err.message === 'conversation_full' ? t('conversationFull') : err.message),
    });
  };

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1">
        {isPending ? (
          <div className="bg-accent h-16 animate-pulse rounded-lg" aria-hidden />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                  message.mine ? 'bg-primary text-white' : 'bg-accent',
                )}
              >
                {/*
                  A React text node — never `dangerouslySetInnerHTML`, never a
                  markdown renderer. Message bodies are untrusted input, and
                  plain-text rendering means there is nothing to sanitise and no
                  parser to get wrong.
                */}
                <p className="break-words whitespace-pre-wrap">{message.body}</p>
                <time
                  dateTime={message.createdAt}
                  className={cn(
                    'mt-1 block text-[10px]',
                    message.mine ? 'text-white/70' : 'text-foreground-muted',
                  )}
                >
                  {new Date(message.createdAt).toLocaleString()}
                </time>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="border-border space-y-2 border-t pt-3">
        {error ? (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('placeholder')}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — the convention every
            // messaging app has trained people to expect.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground-muted text-xs tabular-nums">
            {body.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={send.isPending || !body.trim()}>
            {send.isPending ? t('sending') : t('send')}
          </Button>
        </div>
      </form>
    </div>
  );
}
