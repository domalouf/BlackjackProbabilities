import { useId } from 'react';
import { ShoeState } from '../game/engine';

// Drawing, in CSS px: each pile is a box of card edges W wide and H tall at
// full, seen a little from above and to the right (depth D across, DY up).
const W = 30;
const H = 54;
const D = 7;
const DY = 5;
const GAP = 14;
const LABEL = 76;

const BASE = DY + H;
const NOW_X = W + D + GAP;

function Pile({
  x,
  cards,
  size,
  cutCardAt,
  decks,
  edges,
  sides,
  ghost,
}: {
  x: number;
  cards: number;
  size: number;
  cutCardAt: number;
  decks: number;
  /** Pattern ids for the front and right faces' card edges. */
  edges: string;
  sides: string;
  /** Outline where the dealt cards were. */
  ghost?: boolean;
}) {
  const px = H / size;
  const top = BASE - cards * px;
  // A line across the front of the stack and back along its right side.
  const across = (y: number) =>
    `M ${x} ${y} L ${x + W} ${y} L ${x + W + D} ${y - DY}`;
  const cutY = BASE - cutCardAt * px;
  const cutIn = cards > cutCardAt;
  const deckLines = Array.from({ length: decks - 1 }, (_, k) => BASE - (k + 1) * 52 * px)
    .filter((y) => y > top + 0.5);

  return (
    <g>
      {ghost && (
        <path
          d={`M ${x} ${BASE} V ${DY} L ${x + D} 0 H ${x + W + D} V ${H} L ${x + W} ${BASE} Z`}
          fill="none"
          style={{ stroke: 'var(--line)' }}
          strokeDasharray="2 2"
        />
      )}
      {cards > 0 && (
        <>
          <path
            d={`M ${x + W} ${top} L ${x + W + D} ${top - DY} V ${BASE - DY} L ${x + W} ${BASE} Z`}
            fill={`url(#${sides})`}
          />
          <rect x={x} y={top} width={W} height={BASE - top} fill={`url(#${edges})`} />
          {deckLines.map((y) => (
            <path
              key={y}
              d={across(y)}
              fill="none"
              stroke="rgba(0, 0, 0, 0.4)"
              strokeWidth={0.75}
            />
          ))}
          {/* The top card, face down. */}
          <path
            d={`M ${x} ${top} L ${x + D} ${top - DY} H ${x + W + D} L ${x + W} ${top} Z`}
            style={{ fill: 'var(--card-back)', stroke: 'var(--card)' }}
            strokeWidth={0.75}
            strokeLinejoin="round"
          />
        </>
      )}
      {/* The cut card sticks out of the front of the stack, or once it has
          come out, a dashed line marks where it was. */}
      <path
        d={`M ${x - 3} ${cutY} H ${x + W} L ${x + W + D} ${cutY - DY}`}
        fill="none"
        style={{ stroke: 'var(--gold)' }}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={cutIn ? undefined : '2 2'}
        opacity={cutIn ? 1 : 0.7}
      />
    </g>
  );
}

function Caption({ x, label, count }: { x: number; label: string; count: number }) {
  const cx = x + (W + D) / 2;
  return (
    <>
      <text
        x={cx}
        y={BASE + 11}
        textAnchor="middle"
        fontSize={9}
        letterSpacing={0.6}
        style={{ fill: 'var(--text-muted)' }}
      >
        {label}
      </text>
      <text
        x={cx}
        y={BASE + 24}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        className="tabular"
        style={{ fill: 'var(--text)' }}
      >
        {count}
      </text>
    </>
  );
}

/**
 * A full shoe beside the shoe as it stands, both drawn as a stack of cards, so
 * you can see how much has been dealt and how close the cut card is.
 */
export default function ShoeGauge({
  shoe,
  decks,
}: {
  shoe: ShoeState;
  decks: number;
}) {
  const { size, remaining, cutCardAt } = shoe;
  const cutOut = remaining <= cutCardAt;
  const behindCut = cutCardAt / 52;
  const id = useId().replace(/:/g, '');
  const edges = `${id}-edges`;
  const sides = `${id}-sides`;
  const cutY = BASE - (cutCardAt / size) * H;
  const width = NOW_X + W + D + LABEL;
  const height = BASE + 27;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={`${remaining} of ${size} cards left in the shoe. The cut card is ${behindCut} decks from the back${cutOut ? ' and has come out: the next hand is dealt from a new shoe' : ''}.`}
    >
      <title>
        {`${remaining} of ${size} cards left · cut card ${behindCut} decks from the back (${Math.round((1 - cutCardAt / size) * 100)}% dealt)`}
      </title>
      <defs>
        {/* Card edges, seen side-on: a sliver of shadow between each card. */}
        <pattern id={edges} width={4} height={2} patternUnits="userSpaceOnUse">
          <rect width={4} height={2} style={{ fill: 'var(--card)' }} />
          <rect y={1.25} width={4} height={0.75} fill="#cfc6ad" />
        </pattern>
        <pattern
          id={sides}
          width={4}
          height={2}
          patternUnits="userSpaceOnUse"
          patternTransform={`skewY(${(-Math.atan(DY / D) * 180) / Math.PI})`}
        >
          <rect width={4} height={2} fill="#ddd5bf" />
          <rect y={1.25} width={4} height={0.75} fill="#b3a98f" />
        </pattern>
      </defs>

      <Pile
        x={0}
        cards={size}
        size={size}
        cutCardAt={cutCardAt}
        decks={decks}
        edges={edges}
        sides={sides}
      />
      <Pile
        x={NOW_X}
        cards={remaining}
        size={size}
        cutCardAt={cutCardAt}
        decks={decks}
        edges={edges}
        sides={sides}
        ghost
      />
      <Caption x={0} label="FULL" count={size} />
      <Caption x={NOW_X} label="NOW" count={remaining} />

      <text
        x={NOW_X + W + D + 5}
        y={cutY - DY / 2 + 3}
        fontSize={9}
        fontWeight={600}
        letterSpacing={0.6}
        style={{ fill: 'var(--gold)' }}
      >
        {cutOut ? 'CUT CARD OUT' : 'CUT CARD'}
      </text>
    </svg>
  );
}
