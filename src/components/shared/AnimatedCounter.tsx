import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<Props> = ({
  value,
  duration = 2,
  suffix = '',
  prefix = '',
}) => {
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <div className="font-bold">
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </div>
  );
};