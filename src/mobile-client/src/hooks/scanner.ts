import { useCallback, useEffect, useRef, useState } from 'react';

export function useScanCooldown(cooldownMs = 2000) {
  const [canScan, setCanScan] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCooldown = useCallback(() => {
    if (!canScan) {
      return;
    }
    setCanScan(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCanScan(true);
    }, cooldownMs);
  }, [canScan, cooldownMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { canScan, triggerCooldown };
}
