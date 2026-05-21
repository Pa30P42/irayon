import type { Icon, IconProps } from '@tabler/icons-react';

export const IconRiver: Icon = ({
  size = 24,
  stroke = 2,
  color = 'currentColor',
  className,
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <path d="M5 3 Q 10 7 6 12 T 8 21" />
    <path d="M11 3 Q 16 7 12 12 T 14 21" />
  </svg>
);
