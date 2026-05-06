import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { HeroSearchBar } from './hero-search-bar';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80';

export function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
      <Image src={HERO_IMAGE} alt="" fill sizes="100vw" className="object-cover" priority />
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/20 to-black/60" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">{t('subtitle')}</p>
        <div className="mt-10 flex w-full justify-center">
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
}
