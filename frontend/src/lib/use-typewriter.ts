import { useEffect, useRef, useState } from 'react';

const CHARS_PER_FRAME = 3;

/**
 * Gradually reveals `target` text while `active`, giving a typing effect
 * even when chunks arrive in large bursts from the network.
 */
export function useTypewriter(target: string, active: boolean): string {
  const [displayed, setDisplayed] = useState('');
  const displayedRef = useRef('');
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!active) {
      displayedRef.current = target;
      setDisplayed(target);
      return;
    }

    if (target.length < displayedRef.current.length) {
      displayedRef.current = '';
      setDisplayed('');
    }

    let raf = 0;

    const tick = () => {
      const current = displayedRef.current;
      const goal = targetRef.current;

      if (current.length < goal.length) {
        const backlog = goal.length - current.length;
        const step = Math.max(1, Math.min(CHARS_PER_FRAME * 2, Math.ceil(backlog / 15)));
        const next = goal.slice(0, current.length + step);
        displayedRef.current = next;
        setDisplayed(next);
      }

      if (displayedRef.current.length < targetRef.current.length) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);

  return displayed;
}
