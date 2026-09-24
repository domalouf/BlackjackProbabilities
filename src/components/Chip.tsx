import type { CSSProperties } from 'react';

/** Chip colours by value, as on a casino table: white, red, blue, black, purple. */
function chipColors(units: number): { c: string; s: string; ink: string } {
  if (units >= 16) return { c: '#6b2fa3', s: '#f4eedc', ink: '#fff' };
  if (units >= 8) return { c: '#1c1c20', s: '#f4eedc', ink: '#fff' };
  if (units >= 4) return { c: '#2856b8', s: '#f4eedc', ink: '#fff' };
  if (units >= 2) return { c: '#c8243a', s: '#f4eedc', ink: '#fff' };
  return { c: '#efebe0', s: '#2856b8', ink: '#1c1c20' };
}

export default function Chip({
  units,
  size = 22,
  className = '',
}: {
  units: number;
  size?: number;
  className?: string;
}) {
  const { c, s, ink } = chipColors(units);
  return (
    <span
      className={`chip tabular inline-flex shrink-0 items-center justify-center font-bold ${className}`}
      style={
        {
          '--c': c,
          '--s': s,
          color: ink,
          width: size,
          height: size,
          fontSize: Math.round(size * 0.4),
        } as CSSProperties
      }
    >
      {units}
    </span>
  );
}
