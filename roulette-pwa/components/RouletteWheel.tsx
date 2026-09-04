"use client";

import { useEffect, useRef } from "react";

// Wheel order matches a standard European wheel layout (not betting-grid order).
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export default function RouletteWheel({
  spinning,
  result,
  onSpinEnd,
}: {
  spinning: boolean;
  result: number | null;
  onSpinEnd?: () => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (!spinning || result === null || !wheelRef.current) return;
    const pocketIndex = WHEEL_ORDER.indexOf(result);
    const degPerPocket = 360 / WHEEL_ORDER.length;
    const targetAngle = 360 * 5 + (360 - pocketIndex * degPerPocket);
    rotationRef.current += targetAngle;
    wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;

    const el = wheelRef.current;
    const handle = () => {
      onSpinEnd?.();
      el.removeEventListener("transitionend", handle);
    };
    el.addEventListener("transitionend", handle);
    return () => el.removeEventListener("transitionend", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, result]);

  return (
    <div className="wheel-wrap">
      <div style={{ position: "relative" }}>
        <div className="wheel-pointer" />
        <div className="wheel" ref={wheelRef}>
          <div className="wheel-center">{result ?? "?"}</div>
        </div>
      </div>
    </div>
  );
}
