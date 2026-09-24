import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Hand } from '../game/hand';
import CardView from './CardView';
import Chip from './Chip';

export type Tone = 'win' | 'loss' | 'push';

interface Props {
  hand: Hand;
  label: string;
  hideHole?: boolean;
  /** Dealer only: the hole card turns over when it's revealed. */
  flipHole?: boolean;
  outcome?: Tone | null;
  /** Units riding on this hand, shown as a chip beside the label. */
  bet?: number;
  /** Overlap the cards, to fit two split hands side by side. */
  compact?: boolean;
  /** The hand being played, when there's more than one. */
  active?: boolean;
  /** Waiting its turn while another hand is played. */
  waiting?: boolean;
  /** A short note after the total, e.g. a split hand's result. */
  tag?: ReactNode;
}

function valueLabel(hand: Hand, hideHole: boolean): string {
  if (hideHole) {
    const up = hand.getCards()[1];
    if (!up) return '?';
    const v = up.rank === 'A' ? 11 : up.rank.match(/^\d+$/) ? Number(up.rank) : 10;
    return `${v}${up.rank === 'A' ? ' / 1' : ''} + ?`;
  }
  const { total, softAces } = hand.value();
  if (hand.isBust()) return `${total} — bust`;
  if (softAces > 0 && total !== 21) return `${total - 10} / ${total}`;
  if (hand.isBlackjack()) return 'Blackjack';
  return String(total);
}

export const TONE_COLOR: Record<Tone, string> = {
  win: 'var(--win)',
  loss: 'var(--loss)',
  push: 'var(--push)',
};

/** Roughly when a dealt card has landed; the total updates then, not before. */
const LAND_MS = 380;
/** Gap between cards that arrive together, as in the opening deal. */
const STAGGER_MS = 160;
/** Cards already on the table glide to their new places when the row re-centres. */
const GLIDE_MS = 420;
const GLIDE_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function HandView({
  hand,
  label,
  hideHole,
  flipHole,
  outcome,
  bet,
  compact,
  active,
  waiting,
  tag,
}: Props) {
  const cards = hand.getCards();
  const ids = cards.map((card, i) => card.id ?? i);

  // The total follows the cards, but only once the newest one has landed, so
  // it never gives away a card that's still in the air. A new hand (a new
  // first card) hides the previous hand's total straight away.
  const value = cards.length > 0 ? valueLabel(hand, !!hideHole) : null;
  const handKey = ids[0];
  const [shown, setShown] = useState({ value, handKey });
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setShown((was) =>
          was.value === value && was.handKey === handKey ? was : { value, handKey },
        ),
      reducedMotion() ? 0 : LAND_MS,
    );
    return () => window.clearTimeout(timer);
  }, [value, handKey]);
  const shownValue = shown.handKey === handKey ? shown.value : null;

  // Cards arriving together are staggered; a single new card goes at once.
  // Each card keeps the delay it arrived with, so later renders don't shift
  // an animation that's already running.
  const delays = useRef(new Map<number, number>());
  let arriving = 0;
  const cardDelays = ids.map(
    (id) => delays.current.get(id) ?? STAGGER_MS * arriving++,
  );

  // When a card joins the centred row, the cards already there move over.
  // Animate that move from where each card was (FLIP) instead of jumping.
  // Positions are layout offsets, which ignore any animation in progress.
  const row = useRef<HTMLDivElement>(null);
  const spots = useRef(new Map<number, { x: number; y: number }>());
  useLayoutEffect(() => {
    delays.current = new Map(ids.map((id, i) => [id, cardDelays[i]]));

    const glide = !reducedMotion();
    const next = new Map<number, { x: number; y: number }>();
    for (const node of row.current?.querySelectorAll<HTMLElement>('[data-card]') ?? []) {
      const id = Number(node.dataset.card);
      const spot = { x: node.offsetLeft, y: node.offsetTop };
      const was = spots.current.get(id);
      next.set(id, spot);
      if (!glide || !was) continue;
      const dx = was.x - spot.x;
      const dy = was.y - spot.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: GLIDE_MS, easing: GLIDE_EASE },
      );
    }
    spots.current = next;
  });

  return (
    <div
      className="flex flex-col items-center rounded-2xl px-2 py-1.5 transition-[opacity,box-shadow] duration-200"
      style={{
        opacity: waiting ? 0.55 : 1,
        boxShadow: active ? 'inset 0 0 0 2px var(--gold)' : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        {bet !== undefined && <Chip units={bet} />}
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
        >
          {label}
        </span>
        {shownValue !== null && (
          <span
            className="tabular rounded-full bg-[var(--chip)] px-2 py-0.5 text-sm font-bold"
            style={{ color: outcome ? TONE_COLOR[outcome] : 'var(--text)' }}
          >
            {shownValue}
          </span>
        )}
        {tag}
      </div>
      <div
        ref={row}
        className={`flex justify-center ${compact ? '' : 'flex-wrap gap-1.5 sm:gap-2'}`}
      >
        {cards.length === 0 &&
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-20 w-14 rounded-lg border border-dashed border-[var(--line)] sm:h-28 sm:w-20"
            />
          ))}
        {cards.map((card, i) => {
          const faceDown = hideHole && i === 0;
          return (
            <div
              // Re-key on turning over, so the hole card animates its reveal.
              key={`${ids[i]}-${faceDown ? 'down' : 'up'}`}
              data-card={ids[i]}
              className={`shrink-0 ${compact && i > 0 ? '-ml-8 sm:-ml-11' : ''}`}
            >
              <CardView
                card={card}
                faceDown={faceDown}
                reveal={flipHole && i === 0}
                dealDelay={cardDelays[i]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
