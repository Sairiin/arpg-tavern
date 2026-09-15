"use client";

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Coin = {
  id: number;
  x: number;
  y: number;
  drift: number;
  delay: number;
  size: number;
  spin: number;
};

type CoinFountainProps = {
  children: ReactNode;
  className?: string;
  count?: number;
};

export function CoinFountain({
  children,
  className = "",
  count = 12,
}: CoinFountainProps) {
  const nextId = useRef(0);
  const [coins, setCoins] = useState<Coin[]>([]);

  const clearCoins = useCallback(() => {
    setCoins([]);
  }, []);

  useEffect(() => {
    if (coins.length === 0) {
      return;
    }

    const timeout = window.setTimeout(clearCoins, 1100);

    return () => window.clearTimeout(timeout);
  }, [coins.length, clearCoins]);

  function launchCoins(event: MouseEvent<HTMLSpanElement>) {
    const container = event.currentTarget;
    const bounds = container.getBoundingClientRect();

    const originX = event.clientX - bounds.left;
    const originY = event.clientY - bounds.top;

    const newCoins = Array.from({ length: count }, (_, index): Coin => ({
      id: nextId.current++,
      x: originX,
      y: originY,
      drift: -100 + Math.random() * 200,
      delay: index * 18,
      size: 13 + Math.random() * 11,
      spin: Math.round(Math.random() * 720 - 360),
    }));

    setCoins(newCoins);
  }

  return (
    <span
      className={`coin-fountain ${className}`.trim()}
      onClickCapture={launchCoins}
    >
      {children}

      <span className="coin-fountain-particles" aria-hidden="true">
        {coins.map((coin) => (
          <span
            key={coin.id}
            className="coin-fountain-coin"
            style={
              {
                "--coin-x": `${coin.x}px`,
                "--coin-y": `${coin.y}px`,
                "--coin-drift": `${coin.drift}px`,
                "--coin-delay": `${coin.delay}ms`,
                "--coin-size": `${coin.size}px`,
                "--coin-spin": `${coin.spin}deg`,
              } as CSSProperties
            }
          >
            ◆
          </span>
        ))}
      </span>
    </span>
  );
}
