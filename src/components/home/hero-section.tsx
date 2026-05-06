import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { HeroSearchBar } from './hero-search-bar';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80';

export function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/20 to-black/60" />
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg md:text-xl max-w-2xl text-white/90">{t('subtitle')}</p>
        <div className="mt-10 w-full flex justify-center">
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
}
