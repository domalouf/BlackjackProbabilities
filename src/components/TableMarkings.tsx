import type { CSSProperties, ReactNode } from 'react';
import { HouseRules } from '../game/rules';

interface Props {
  rules: HouseRules;
  /** Hand result announced over the markings, once a hand is settled. */
  announcement?: ReactNode;
  style?: CSSProperties;
}

/**
 * The house rules printed on the felt in an arc between the dealer and the
 * player, the way a real table carries them. Results are announced on top.
 */
export default function TableMarkings({ rules, announcement, style }: Props) {
  const payout =
    rules.blackjackPayout === 1.5 ? '3 TO 2' : `${rules.blackjackPayout} TO 1`;
  const dealerRule = `DEALER ${rules.hitSoft17 ? 'HITS' : 'STANDS ON'} SOFT 17`;

  return (
    <div className="relative flex justify-center" style={style}>
      <svg
        viewBox="0 0 600 112"
        className="serif w-full max-w-xl transition-opacity duration-200"
        style={{ opacity: announcement ? 0.2 : 1 }}
        role="img"
        aria-label={`Blackjack pays ${payout.toLowerCase()}. ${dealerRule.toLowerCase()}. ${rules.decks} decks.`}
      >
        <defs>
          <path id="markings-top" d="M 20 6 Q 300 126 580 6" />
          <path id="markings-bottom" d="M 20 42 Q 300 162 580 42" />
        </defs>
        <path
          d="M 20 22 Q 300 142 580 22"
          fill="none"
          stroke="var(--ink)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <text
          fill="var(--gold)"
          fontSize="22"
          fontWeight="700"
          letterSpacing="4"
        >
          <textPath href="#markings-top" startOffset="50%" textAnchor="middle">
            BLACKJACK PAYS {payout}
          </textPath>
        </text>
        <text
          fill="var(--ink)"
          fillOpacity="0.6"
          fontSize="15"
          letterSpacing="2.5"
        >
          <textPath href="#markings-bottom" startOffset="50%" textAnchor="middle">
            {dealerRule} · {rules.decks} DECKS
          </textPath>
        </text>
      </svg>

      {announcement && (
        <div className="absolute inset-0 flex items-center justify-center">
          {announcement}
        </div>
      )}
    </div>
  );
}
