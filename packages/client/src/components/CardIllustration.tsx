/**
 * SVG illustrations for each card value range.
 * Adds personality and visual interest to the cards.
 */

interface Props {
  value: number;
  size?: 'tiny' | 'small' | 'normal';
}

export default function CardIllustration({ value, size = 'normal' }: Props) {
  if (size === 'tiny') return null; // Too small for illustrations

  const s = size === 'small' ? 0.6 : 1;
  const w = 28 * s;
  const h = 28 * s;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-30 pointer-events-none"
    >
      {getIllustration(value)}
    </svg>
  );
}

function getIllustration(value: number) {
  if (value <= -2) return <Snowflake />;
  if (value === -1) return <Moon />;
  if (value === 0) return <Sun />;
  if (value === 1) return <Clover />;
  if (value === 2) return <Leaf />;
  if (value === 3) return <Bird />;
  if (value === 4) return <Tree />;
  if (value === 5) return <Compass />;
  if (value === 6) return <Anchor />;
  if (value === 7) return <Ship />;
  if (value === 8) return <Treasure />;
  if (value === 9) return <Flame />;
  if (value === 10) return <Lightning />;
  if (value === 11) return <Skull />;
  return <Dragon />;
}

function Snowflake() {
  return (
    <g stroke="white" strokeWidth="1.2" strokeLinecap="round">
      <line x1="14" y1="2" x2="14" y2="26" />
      <line x1="2" y1="14" x2="26" y2="14" />
      <line x1="5" y1="5" x2="23" y2="23" />
      <line x1="23" y1="5" x2="5" y2="23" />
      <line x1="14" y1="5" x2="11" y2="2" />
      <line x1="14" y1="5" x2="17" y2="2" />
      <line x1="14" y1="23" x2="11" y2="26" />
      <line x1="14" y1="23" x2="17" y2="26" />
      <line x1="5" y1="14" x2="2" y2="11" />
      <line x1="5" y1="14" x2="2" y2="17" />
      <line x1="23" y1="14" x2="26" y2="11" />
      <line x1="23" y1="14" x2="26" y2="17" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <path
        d="M18 5C13 5 9 9 9 14s4 9 9 9c-1 0-2-.2-3-.5C10 21 7 17.8 7 14s3-7 7.5-8.5c1-.3 2-.5 3.5-.5z"
        fill="white"
      />
      <circle cx="20" cy="8" r="1" fill="white" />
      <circle cx="23" cy="12" r="0.6" fill="white" />
      <circle cx="22" cy="5" r="0.8" fill="white" />
    </g>
  );
}

function Sun() {
  return (
    <g>
      <circle cx="14" cy="14" r="5" fill="white" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 14 + Math.cos(rad) * 7;
        const y1 = 14 + Math.sin(rad) * 7;
        const x2 = 14 + Math.cos(rad) * 10;
        const y2 = 14 + Math.sin(rad) * 10;
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Clover() {
  return (
    <g fill="white">
      <circle cx="14" cy="9" r="4" />
      <circle cx="9" cy="15" r="4" />
      <circle cx="19" cy="15" r="4" />
      <rect x="13" y="16" width="2" height="8" rx="1" />
    </g>
  );
}

function Leaf() {
  return (
    <g>
      <path
        d="M14 4C8 4 4 10 6 18c1 3 3 5 8 6 5-1 7-3 8-6 2-8-2-14-8-14z"
        fill="white"
      />
      <line x1="14" y1="8" x2="14" y2="22" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      <line x1="14" y1="12" x2="10" y2="9" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      <line x1="14" y1="15" x2="18" y2="12" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
    </g>
  );
}

function Bird() {
  return (
    <g stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <path d="M4 16C8 10 12 12 14 14c2-2 6-4 10 2" />
      <path d="M8 14C10 10 12 11 14 13" />
      <circle cx="14" cy="14" r="1" fill="white" />
    </g>
  );
}

function Tree() {
  return (
    <g fill="white">
      <polygon points="14,3 6,13 22,13" />
      <polygon points="14,8 4,18 24,18" />
      <rect x="12" y="18" width="4" height="6" rx="1" />
    </g>
  );
}

function Compass() {
  return (
    <g>
      <circle cx="14" cy="14" r="10" stroke="white" strokeWidth="1.2" fill="none" />
      <polygon points="14,4 16,14 14,16 12,14" fill="white" />
      <polygon points="14,24 12,14 14,12 16,14" fill="white" opacity="0.5" />
      <circle cx="14" cy="14" r="1.5" fill="white" />
    </g>
  );
}

function Anchor() {
  return (
    <g stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <circle cx="14" cy="6" r="2.5" />
      <line x1="14" y1="8.5" x2="14" y2="24" />
      <path d="M7 20C7 24 14 26 14 24" />
      <path d="M21 20C21 24 14 26 14 24" />
      <line x1="9" y1="13" x2="19" y2="13" />
    </g>
  );
}

function Ship() {
  return (
    <g fill="white">
      <polygon points="4,20 14,22 24,20 22,24 6,24" />
      <rect x="13" y="6" width="2" height="14" rx="0.5" />
      <polygon points="15,7 15,16 24,16" opacity="0.7" />
    </g>
  );
}

function Treasure() {
  return (
    <g>
      <rect x="5" y="12" width="18" height="12" rx="2" fill="white" />
      <rect x="5" y="12" width="18" height="5" rx="2" fill="white" opacity="0.7" />
      <circle cx="14" cy="17" r="2.5" fill="rgba(0,0,0,0.2)" />
      <rect x="12.5" y="14" width="3" height="2" rx="0.5" fill="rgba(0,0,0,0.15)" />
      <path d="M8 12V10a6 6 0 0 1 12 0v2" stroke="white" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function Flame() {
  return (
    <g fill="white">
      <path d="M14 2C10 8 6 12 6 18c0 5 3.5 8 8 8s8-3 8-8c0-6-4-10-8-16z" />
      <path d="M14 12c-2 3-4 5-4 8 0 2.5 1.8 4 4 4s4-1.5 4-4c0-3-2-5-4-8z" fill="rgba(0,0,0,0.15)" />
    </g>
  );
}

function Lightning() {
  return (
    <g fill="white">
      <polygon points="16,2 8,15 13,15 11,26 20,13 15,13" />
    </g>
  );
}

function Skull() {
  return (
    <g fill="white">
      <ellipse cx="14" cy="12" rx="8" ry="9" />
      <circle cx="10" cy="11" r="2.5" fill="rgba(0,0,0,0.3)" />
      <circle cx="18" cy="11" r="2.5" fill="rgba(0,0,0,0.3)" />
      <ellipse cx="14" cy="16" rx="1.5" ry="1" fill="rgba(0,0,0,0.3)" />
      <rect x="10" y="21" width="8" height="4" rx="1" />
      <line x1="12" y1="21" x2="12" y2="25" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <line x1="14" y1="21" x2="14" y2="25" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <line x1="16" y1="21" x2="16" y2="25" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
    </g>
  );
}

function Dragon() {
  return (
    <g fill="white">
      <path d="M8 24C6 20 4 16 6 12c1-3 4-5 6-6 0 2 1 4 3 5 2-3 5-6 8-7-1 3-1 6 0 9 1 3 0 6-2 8l-3-2c-1 2-3 3-5 4-2-1-3-2-5-3z" />
      <circle cx="10" cy="11" r="1" fill="rgba(0,0,0,0.3)" />
      <path d="M5 10L2 7l4 1-1-4 3 3" fill="white" opacity="0.7" />
    </g>
  );
}
