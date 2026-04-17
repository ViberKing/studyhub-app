"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay?: number; // ms
}

export default function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  delay = 0,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const startValueRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = startValueRef.current;
    const end = value;
    const startTime = performance.now() + delay;

    // easeOutCubic — quick start, smooth ease-out
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    function step(now: number) {
      if (cancelled) return;
      const elapsed = now - startTime;
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * ease(t);
      setDisplay(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        startValueRef.current = end;
      }
    }
    frameRef.current = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, delay]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();

  return <>{prefix}{formatted}{suffix}</>;
}
