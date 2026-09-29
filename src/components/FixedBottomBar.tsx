import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A bar pinned to the bottom of the viewport, plus an in-flow spacer that is kept
 * exactly as tall as the bar so the end of the page can always be scrolled clear of it.
 * The bar pads itself for the iPhone home-indicator safe area, and the spacer tracks that too.
 */
export function FixedBottomBar({ className = "", children }: { className?: string; children: ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => setHeight(bar.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden className="shrink-0" style={{ height }} />
      <div
        ref={barRef}
        className={`fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-slate-800 bg-slate-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${className}`}
      >
        {children}
      </div>
    </>
  );
}
