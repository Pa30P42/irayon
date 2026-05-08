import { useTranslations } from 'next-intl';

/**
 * Hidden until focused — keyboard users (Tab from address bar) can jump
 * straight to the main content, bypassing the persistent header. Pair with
 * an element that has `id="main"`.
 */
export function SkipLink({
  targetId = 'main',
  /**
   * Optional override; otherwise pulls from `common.skipToContent` so the
   * label respects the active locale.
   */
  label,
}: {
  targetId?: string;
  label?: string;
}) {
  const t = useTranslations('common');
  return (
    <a
      href={`#${targetId}`}
      className="bg-primary fixed top-2 left-2 z-[100] [transform:translateY(-200%)] rounded-md px-3 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:[transform:translateY(0)]"
    >
      {label ?? t('skipToContent')}
    </a>
  );
}
