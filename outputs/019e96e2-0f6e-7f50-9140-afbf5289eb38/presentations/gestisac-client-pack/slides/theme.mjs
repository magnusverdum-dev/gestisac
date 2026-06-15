export const C = {
  ink: "#0B2545",
  navy: "#163B66",
  blue: "#2E74B5",
  sky: "#E8EEF5",
  line: "#CBD5E1",
  paper: "#F8FAFC",
  white: "#FFFFFF",
  muted: "#667085",
  gold: "#D7A84F",
  green: "#2E7D32",
  amber: "#B36B00",
  red: "#9B1C1C",
};

export function bg(slide, ctx, fill = C.paper) {
  ctx.addShape(slide, { x: 0, y: 0, w: ctx.W, h: ctx.H, fill, line: ctx.line(fill, 0) });
}

export function txt(ctx, slide, text, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text,
    x,
    y,
    w,
    h,
    fontSize: opts.size || 28,
    color: opts.color || C.ink,
    bold: opts.bold || false,
    align: opts.align || "left",
    valign: opts.valign || "top",
    fill: opts.fill || "#00000000",
    line: ctx.line(opts.line || "#00000000", opts.lineWidth || 0),
    insets: opts.insets || { left: 0, right: 0, top: 0, bottom: 0 },
    typeface: opts.face || ctx.fonts.body,
    name: opts.name,
  });
}

export function title(ctx, slide, kicker, headline, subtitle = "") {
  txt(ctx, slide, kicker.toUpperCase(), 72, 42, 720, 28, { size: 16, bold: true, color: C.gold });
  txt(ctx, slide, headline, 72, 78, 760, 92, { size: 38, bold: true, color: C.ink, face: ctx.fonts.title });
  if (subtitle) txt(ctx, slide, subtitle, 74, 168, 830, 54, { size: 20, color: C.muted });
}

export function footer(ctx, slide, n) {
  ctx.addShape(slide, { x: 72, y: 670, w: 1136, h: 1, fill: C.line, line: ctx.line(C.line, 0) });
  txt(ctx, slide, "GESTISAC | pacote executivo-tecnico", 72, 682, 520, 20, { size: 12, color: C.muted });
  txt(ctx, slide, String(n).padStart(2, "0"), 1165, 682, 44, 20, { size: 12, color: C.muted, align: "right" });
}

export function panel(ctx, slide, x, y, w, h, fill = C.white, line = C.line) {
  return ctx.addShape(slide, { x, y, w, h, fill, line: ctx.line(line, 1.2) });
}

export function metric(ctx, slide, label, value, detail, x, y, w, accent = C.blue) {
  panel(ctx, slide, x, y, w, 96, C.white);
  ctx.addShape(slide, { x, y, w: 6, h: 96, fill: accent, line: ctx.line(accent, 0) });
  txt(ctx, slide, value, x + 18, y + 16, w - 30, 28, { size: 26, bold: true, color: C.ink });
  txt(ctx, slide, label, x + 18, y + 48, w - 30, 20, { size: 13, bold: true, color: C.muted });
  txt(ctx, slide, detail, x + 18, y + 68, w - 30, 18, { size: 11, color: C.muted });
}

export function lane(ctx, slide, label, text, x, y, w, h, accent = C.blue) {
  panel(ctx, slide, x, y, w, h, C.white);
  ctx.addShape(slide, { x, y, w, h: 8, fill: accent, line: ctx.line(accent, 0) });
  txt(ctx, slide, label, x + 18, y + 18, w - 36, 30, { size: 19, bold: true, color: C.ink });
  txt(ctx, slide, text, x + 18, y + 56, w - 36, h - 68, { size: 15, color: C.muted, insets: { left: 0, right: 0, top: 0, bottom: 0 } });
}

export function pill(ctx, slide, label, x, y, w, fill = C.sky, color = C.ink) {
  ctx.addShape(slide, { x, y, w, h: 34, fill, line: ctx.line(C.line, 1) });
  txt(ctx, slide, label, x, y + 8, w, 18, { size: 13, bold: true, color, align: "center" });
}
