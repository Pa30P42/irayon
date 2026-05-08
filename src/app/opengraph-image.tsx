import { SITE } from '@/lib/constants';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'iRayon — Villa rentals across Azerbaijan';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        color: '#ffffff',
        background: 'linear-gradient(135deg, #1e3d2a 0%, #2d5a3d 60%, #5a9e6f 100%)',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          opacity: 0.92,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#ffffff',
            color: '#2d5a3d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          iR
        </div>
        {SITE.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
          }}
        >
          Villa rentals across Azerbaijan
        </div>
        <div style={{ fontSize: 30, opacity: 0.85, lineHeight: 1.3, maxWidth: 880 }}>
          Mountains, forests, riverside — find your perfect nature retreat.
        </div>
      </div>
    </div>,
    { ...size },
  );
}
