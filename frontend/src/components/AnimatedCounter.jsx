'use client';

import { useEffect, useState } from 'react';
import { useSpring, useMotionValueEvent } from 'framer-motion';

export default function AnimatedCounter({
  value,
  decimalPlaces = 0,
  suffix = '',
}) {
  const [display, setDisplay] = useState(0);
  const spring = useSpring(0, { mass: 0.5, stiffness: 80 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useMotionValueEvent(spring, 'change', (v) => setDisplay(v));

  return <span className="tabular-nums">{display.toFixed(decimalPlaces)}{suffix}</span>;
}
