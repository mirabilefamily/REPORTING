import { useEffect, useRef } from 'react';

// Pushes a history entry while `open` is true so the browser/OS back gesture closes the sub-view.
export function useBackable(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (open && !pushed.current) {
      window.history.pushState({ sub: true }, '');
      pushed.current = true;
    }
    if (!open && pushed.current) {
      pushed.current = false;
      if (window.history.state?.sub) window.history.back();
    }
  }, [open]);
  useEffect(() => {
    const onPop = () => { if (pushed.current) { pushed.current = false; closeRef.current(); } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}

export const navSlug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
