type Box = { left: number; top: number; width: number; height: number };

// Where to scroll a view so that the active reply of a sheet is seen, at the zoom the
// reader has set (the zoom is never changed here). Across, the middle of the view is
// the middle of the Gemara zone (all located replies), not of the commentary beside
// it; down, the middle of the view is the middle of the reply, or, if the reply is
// taller than the view, its beginning.
// `stage` is the sheet's place inside the scrollable content.
export function centerScroll(stage: { left: number; top: number; width: number }, reply: Box[], gemara: Box[], view: { width: number; height: number }) {
  const across = gemara.length ? (Math.min(...gemara.map((box) => box.left)) + Math.max(...gemara.map((box) => box.left + box.width))) / 2 : stage.width / 2;
  const left = Math.max(0, stage.left + across - view.width / 2);
  if (!reply.length) return { top: 0, left };
  const top = Math.min(...reply.map((line) => line.top)), bottom = Math.max(...reply.map((line) => line.top + line.height));
  const targetTop = bottom - top >= view.height - 48 ? stage.top + top - 24 : stage.top + (top + bottom) / 2 - view.height / 2;
  return { top: Math.max(0, targetTop), left };
}
