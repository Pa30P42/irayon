import type { Icon } from '@tabler/icons-react';

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
    <path d="M2 9 Q 7 4 12 9 T 22 9" />
    <path d="M2 15 Q 7 10 12 15 T 22 15" />
  </svg>
);
