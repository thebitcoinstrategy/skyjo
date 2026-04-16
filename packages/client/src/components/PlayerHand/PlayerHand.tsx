import Card from '../Card/Card';
import type { VisibleCardSlot } from '@skyjo/shared';

interface PlayerHandProps {
  cards: VisibleCardSlot[];
  small?: boolean;
  onCardClick?: (cardIndex: number) => void;
  interactive?: boolean;
  isDealing?: boolean;
}

export default function PlayerHand({ cards, small, onCardClick, interactive, isDealing }: PlayerHandProps) {
  const totalCards = cards.length;
  const rows = 4;
  const cols = Math.ceil(totalCards / rows);
  const gap = small ? 'gap-0.5' : 'gap-1.5';

  return (
    <div
      className={`grid ${gap}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, auto)`,
        gridTemplateRows: `repeat(${rows}, auto)`,
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const cardIdx = col * rows + row;
          if (cardIdx >= totalCards) return <div key={`${col}-${row}`} />;
          const card = cards[cardIdx];
          const dealIndex = col * rows + row;
          return (
            <Card
              key={`${col}-${row}`}
              value={card.value}
              faceUp={card.faceUp}
              small={small}
              onClick={onCardClick ? () => onCardClick(cardIdx) : undefined}
              interactive={interactive ?? false}
              dealDelay={isDealing ? dealIndex * 0.06 : undefined}
            />
          );
        })
      )}
    </div>
  );
}
