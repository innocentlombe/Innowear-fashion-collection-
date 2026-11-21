import React from 'react';

interface VerificationMatrixProps {
  value: string;
  size?: number;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const VerificationMatrix: React.FC<VerificationMatrixProps> = ({ value, size = 76 }) => {
  const grid = 21;
  const cells: Array<{ x: number; y: number }> = [];

  const isFinder = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= grid - 7;
    const inBottomLeft = r >= grid - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const finderFilled = (r: number, c: number) => {
    const lr = r >= grid - 7 ? r - (grid - 7) : r;
    const lc = c >= grid - 7 ? c - (grid - 7) : c;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  let seed = hashSeed(value);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (isFinder(r, c)) {
        if (finderFilled(r, c)) cells.push({ x: c, y: r });
      } else if (
        (r === 7 && c < 8) ||
        (c === 7 && r < 8) ||
        (r === 7 && c >= grid - 8) ||
        (c === grid - 8 && r < 8) ||
        (r === grid - 8 && c < 8) ||
        (c === 7 && r >= grid - 8)
      ) {
        // quiet finder separator
      } else {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        if ((seed >>> 29) & 1) {
          cells.push({ x: c, y: r });
        }
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-1 -1 ${grid + 2} ${grid + 2}`}
      className="bg-white rounded-sm p-1 shrink-0"
      role="img"
      aria-label={`Order verification code ${value}`}
    >
      <rect x="-1" y="-1" width={grid + 2} height={grid + 2} fill="#ffffff" />
      {cells.map((cell, i) => (
        <rect key={i} x={cell.x} y={cell.y} width={1} height={1} fill="#09090b" />
      ))}
    </svg>
  );
};
