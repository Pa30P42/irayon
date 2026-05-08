import enMessages from '@/i18n/messages/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import type { ReactElement, ReactNode } from 'react';

type ProvidersProps = {
  children: ReactNode;
  locale?: string;
  messages?: AbstractIntlMessages;
  searchParams?: string | URLSearchParams | Record<string, string>;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
};

/** Fresh QueryClient per render — disables retries so failed queries fail fast in tests. */
const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

export function Providers({
  children,
  locale = 'en',
  messages = enMessages as AbstractIntlMessages,
  searchParams,
  onUrlUpdate,
}: ProvidersProps) {
  const queryClient = makeTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
          {children}
        </NuqsTestingAdapter>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

type CustomRenderOptions = RenderOptions & Omit<ProvidersProps, 'children'>;

export function renderWithProviders(
  ui: ReactElement,
  { locale, messages, searchParams, onUrlUpdate, ...options }: CustomRenderOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers
        locale={locale}
        messages={messages}
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
      >
        {children}
      </Providers>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
