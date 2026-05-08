import { sanitizeJsonLd } from '@/lib/json-ld';

type JsonLdProps = {
  data: object | object[];
};

/**
 * Renders one or more JSON-LD blocks safely (sanitizing any chars that could
 * break out of a <script> tag). Pass an object or an array of objects.
 */
export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(item) }}
        />
      ))}
    </>
  );
}
