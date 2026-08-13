import { useCallback, useState } from 'react';

/** Minimal state + trigger for the Toast component. Resets to null first
 * so calling showToast with the same text twice in a row still re-triggers
 * the fade animation (Toast's effect only fires when `message` changes). */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(null);
    requestAnimationFrame(() => setMessage(text));
  }, []);

  return { message, showToast };
}
