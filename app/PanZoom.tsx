"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

type Box = { left: number; top: number; width: number; height: number };
type View = { x: number; y: number; scale: number };

// A frame in which its content is moved with one finger and enlarged by pinching.
// The frame never changes size and nothing outside it moves, so the rest of the page is
// scrolled by swiping outside the frame. The content is placed with a CSS transform;
// `--sheet-scale` tells the content the scale, so that small notes can be drawn at a
// readable size.
export function PanZoom({ children }: { children: (focus: (box: Box) => void) => ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, scale: 1 });
  const touched = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; midX: number; midY: number; start: View } | null>(null);
  const moved = useRef(false);
  const user = useRef(false);

  const limits = useCallback(() => {
    const f = frame.current, c = content.current;
    if (!f || !c) return { fit: 1, max: 1.4, width: 1, height: 1, frameW: 1, frameH: 1 };
    const width = c.offsetWidth || 1, height = c.offsetHeight || 1;
    const fit = f.clientWidth / width;
    return { fit, max: Math.max(fit * 2.5, 1.4), width, height, frameW: f.clientWidth, frameH: f.clientHeight };
  }, []);

  const apply = useCallback((next: View) => {
    const c = content.current;
    if (!c) return;
    const { fit, max, width, height, frameW, frameH } = limits();
    const scale = Math.min(max, Math.max(fit, next.scale));
    const shown = { w: width * scale, h: height * scale };
    const x = shown.w <= frameW ? (frameW - shown.w) / 2 : Math.min(0, Math.max(frameW - shown.w, next.x));
    const y = shown.h <= frameH ? (frameH - shown.h) / 2 : Math.min(0, Math.max(frameH - shown.h, next.y));
    view.current = { x, y, scale };
    c.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    c.style.setProperty("--sheet-scale", String(scale));
  }, [limits]);

  // the whole width of the sheet at first; kept so until the reader has moved it
  useEffect(() => {
    const f = frame.current, c = content.current;
    if (!f || !c) return;
    const refit = () => { if (!user.current) apply({ x: 0, y: 0, scale: limits().fit }); else apply(view.current); };
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(f); observer.observe(c);
    return () => observer.disconnect();
  }, [apply, limits]);

  const focus = useCallback((box: Box) => {
    const { frameH } = limits();
    const scale = view.current.scale;
    const tall = box.height * scale >= frameH - 24;
    apply({ x: view.current.x, y: tall ? -box.top * scale + 12 : frameH / 2 - (box.top + box.height / 2) * scale, scale });
  }, [apply, limits]);

  const pinch = () => {
    const [a, b] = [...touched.current.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  };

  return <div ref={frame} className="panZoom"
    onPointerDown={(event) => {
      touched.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved.current = false;
      if (touched.current.size === 2) gesture.current = { ...pinch(), start: { ...view.current } };
    }}
    onPointerMove={(event) => {
      const last = touched.current.get(event.pointerId);
      if (!last) return;
      if (touched.current.size === 1) {
        const dx = event.clientX - last.x, dy = event.clientY - last.y;
        if (!moved.current && Math.hypot(dx, dy) < 6) return;
        moved.current = true; user.current = true;
        touched.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        apply({ ...view.current, x: view.current.x + dx, y: view.current.y + dy });
      } else if (gesture.current) {
        touched.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const now = pinch(), start = gesture.current.start, box = frame.current!.getBoundingClientRect();
        const scale = start.scale * now.distance / gesture.current.distance;
        const ratio = Math.min(Math.max(scale, limits().fit), limits().max) / start.scale;
        // the point under the fingers stays under them
        const fromX = gesture.current.midX - box.left, fromY = gesture.current.midY - box.top;
        moved.current = true; user.current = true;
        apply({ scale: start.scale * ratio, x: now.midX - box.left - (fromX - start.x) * ratio, y: now.midY - box.top - (fromY - start.y) * ratio });
      }
    }}
    onPointerUp={(event) => { touched.current.delete(event.pointerId); gesture.current = null; }}
    onPointerCancel={(event) => { touched.current.delete(event.pointerId); gesture.current = null; }}
    // a drag that ends over a word is not a tap on it
    onClickCapture={(event) => { if (moved.current) { event.stopPropagation(); event.preventDefault(); moved.current = false; } }}>
    <div ref={content} className="panZoomContent">{children(focus)}</div>
  </div>;
}
