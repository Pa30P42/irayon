import { BrandLoader } from '@/components/shared/brand-loader';

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <BrandLoader />
    </div>
  );
}
