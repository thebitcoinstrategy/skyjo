import type { CardValue } from '@skyjo/shared';

interface CardProps {
  value: CardValue | null;
  faceUp: boolean;
  small?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

function getCardColor(value: number): string {
  if (value <= -2) return 'text-blue-700 bg-blue-50';
  if (value === -1) return 'text-blue-600 bg-blue-50';
  if (value === 0) return 'text-yellow-700 bg-yellow-50';
  if (value <= 4) return 'text-green-700 bg-green-50';
  if (value <= 8) return 'text-orange-600 bg-orange-50';
  return 'text-red-700 bg-red-50';
}

export default function Card({ value, faceUp, small, onClick, interactive }: CardProps) {
  const w = small ? 'w-7 h-10' : 'w-14 h-20';

  if (faceUp && value !== null) {
    const colorClass = getCardColor(value);
    return (
      <button
        onClick={onClick}
        disabled={!interactive}
        className={`${w} rounded-lg ${colorClass} border border-black/10 flex items-center justify-center shadow-sm transition-all ${
          interactive
            ? 'hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md'
            : 'cursor-default'
        }`}
      >
        <span className={`font-bold ${small ? 'text-xs' : 'text-xl'}`}>
          {value}
        </span>
      </button>
    );
  }

  // Face-down card
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`${w} rounded-lg bg-card-back border border-blue-800 flex items-center justify-center shadow-sm transition-all ${
        interactive
          ? 'hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md hover:border-gold'
          : 'cursor-default'
      }`}
    >
      <div className={`${small ? 'w-4 h-6' : 'w-8 h-12'} rounded border border-blue-400/30 bg-card-back-pattern`} />
    </button>
  );
}
