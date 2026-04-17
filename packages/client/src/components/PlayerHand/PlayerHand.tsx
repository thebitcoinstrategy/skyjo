import Card from '../Card/Card';
import type { VisibleCardSlot } from '@skyjo/shared';
import { ROWS } from '@skyjo/shared';

interface PlayerHandProps {
  cards: VisibleCardSlot[];
  small?: boolean;
  tiny?: boolean;
  onCardClick?: (cardIndex: number) => void;
  interactive?: boolean;
  isDealing?: boolean;
  highlightAll?: boolean;
  highlightFaceDown?: boolean;
  dropTarget?: number | null;
  onTouchStartCard?: (cardIndex: number) => (e: React.TouchEvent) => void;
  skipFlipForIndex?: number | null;
}

export default function PlayerHand({
  cards,
  small,
  tiny,
  onCardClick,
  interactive,
  isDealing,
  highlightAll,
  highlightFaceDown,
  dropTarget,
  onTouchStartCard,
  skipFlipForIndex,
}: PlayerHandProps) {
  const totalCards = cards.length;
  const rows = ROWS;
  const cols = Math.ceil(totalCards / rows);
  const gap = tiny ? 'gap-px' : small ? 'gap-0.5' : 'gap-1';

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
            <div
              key={`${col}-${row}`}
              data-card-index={cardIdx}
              onTouchStart={onTouchStartCard ? onTouchStartCard(cardIdx) : undefined}
            >
              <Card
                value={card.value}
                faceUp={card.faceUp}
                small={small}
                tiny={tiny}
                onClick={onCardClick ? () => onCardClick(cardIdx) : undefined}
                interactive={interactive ?? false}
                highlight={!small && !tiny && (highlightAll || (highlightFaceDown && !card.faceUp))}
                dealDelay={isDealing ? dealIndex * 0.06 : undefined}
                dropTarget={dropTarget === cardIdx}
                skipFlipAnimation={skipFlipForIndex === cardIdx}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
