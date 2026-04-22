import { useCallback, useEffect, useRef, useState } from 'react';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';

const QUOTES: { text: string; author: string }[] = [
  { text: 'Logic will get you from A to B. Imagination will take you everywhere.', author: 'Albert Einstein' },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: 'Michael Jordan' },
  { text: 'The biggest adventure you can take is to live the life of your dreams.', author: 'Oprah Winfrey' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
  { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.', author: 'Ralph Waldo Emerson' },
  { text: 'What you get by achieving your goals is not as important as what you become by achieving your goals.', author: 'Zig Ziglar' },
  { text: 'I attribute my success to this: I never gave or took any excuse.', author: 'Florence Nightingale' },
  { text: 'Every strike brings me closer to the next home run.', author: 'Babe Ruth' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: "Whether you think you can or you think you can't, you're right.", author: 'Henry Ford' },
  { text: 'The best way to predict your future is to create it.', author: 'Abraham Lincoln' },
];

function pickRandom() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]!;
}

export function Quote() {
  const { settings } = useWidgetSettings();
  const autoRefreshSeconds = settings.autoRefreshSeconds as number;

  const [quote, setQuote] = useState(pickRandom);
  const [fading, setFading] = useState(false);
  // Guard against double-refresh if both the user clicks ↻ and the timer
  // fires at the same moment.
  const fadingRef = useRef(false);

  const refresh = useCallback(() => {
    if (fadingRef.current) return;
    fadingRef.current = true;
    setFading(true);
    setTimeout(() => {
      setQuote(pickRandom());
      setFading(false);
      fadingRef.current = false;
    }, 400);
  }, []);

  useEffect(() => {
    if (!autoRefreshSeconds || autoRefreshSeconds <= 0) return;
    const id = window.setInterval(refresh, autoRefreshSeconds * 1000);
    return () => clearInterval(id);
  }, [autoRefreshSeconds, refresh]);

  return (
    <header className={`header-quote${fading ? ' fade-out' : ''}`}>
      <p className="minimal-quote">&ldquo;{quote.text}&rdquo;</p>
      <p className="minimal-author">— {quote.author}</p>
      <button
        type="button"
        className="quote-refresh-btn"
        onClick={refresh}
        title="New quote"
        aria-label="New quote"
      >
        ↻
      </button>
    </header>
  );
}
