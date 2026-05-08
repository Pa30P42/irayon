'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

const Loaded = dynamic(() => import('./listings-map').then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => <div className="bg-accent h-full w-full animate-pulse rounded-[inherit]" />,
});

type Props = ComponentProps<typeof Loaded>;

export function ListingsMapLoader(props: Props) {
  return <Loaded {...props} />;
}
