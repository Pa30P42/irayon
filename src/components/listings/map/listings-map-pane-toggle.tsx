'use client';

import { IconLayoutGrid, IconMap2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export type MobilePane = 'map' | 'list';

type Props = {
  value: MobilePane;
  onChange: (pane: MobilePane) => void;
};

export function ListingsMapPaneToggle({ value, onChange }: Props) {
  const tMap = useTranslations('listings.map');

  return (
    <div
      role="tablist"
      aria-label={tMap('title')}
      className="border-border bg-background flex items-center justify-center gap-1 border-b p-2 lg:hidden"
    >
      <PaneTab
        active={value === 'map'}
        onClick={() => onChange('map')}
        icon={<IconMap2 size={16} />}
        label={tMap('showMap')}
      />
      <PaneTab
        active={value === 'list'}
        onClick={() => onChange('list')}
        icon={<IconLayoutGrid size={16} />}
        label={tMap('showList')}
      />
    </div>
  );
}

function PaneTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'bg-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white'
          : 'text-foreground-muted hover:bg-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium'
      }
    >
      {icon}
      {label}
    </button>
  );
}
