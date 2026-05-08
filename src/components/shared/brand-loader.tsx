import type { SVGProps } from 'react';

type BrandLoaderProps = {
  size?: number;
  label?: string;
};

export function BrandLoader({ size = 80, label = 'iRayon' }: BrandLoaderProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <BrandMark className="absolute inset-0 h-full w-full opacity-[0.14]" />
        <div className="brand-loader-fill absolute inset-0">
          <BrandMark className="h-full w-full" />
        </div>
      </div>
      <p className="brand-loader-pulse text-foreground-muted text-[11px] font-semibold tracking-[0.32em] uppercase">
        {label}
      </p>
      <span className="sr-only">Loading</span>
    </div>
  );
}

function BrandMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...rest}
    >
      <rect width="96" height="96" rx="24" fill="#2d5a3d" />
      <path d="M48 18 L78 46 H18 Z" fill="white" />
      <rect x="24" y="46" width="48" height="30" rx="2" fill="white" />
      <rect x="28" y="51" width="12" height="12" rx="2" fill="#2d5a3d" />
      <rect x="56" y="51" width="12" height="12" rx="2" fill="#2d5a3d" />
      <rect x="38" y="56" width="20" height="20" rx="3" fill="#2d5a3d" />
      <rect x="56" y="24" width="8" height="16" rx="2" fill="white" />
    </svg>
  );
}
