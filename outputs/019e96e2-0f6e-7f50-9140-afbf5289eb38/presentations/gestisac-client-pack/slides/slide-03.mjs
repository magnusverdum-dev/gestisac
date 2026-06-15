import { C, bg, title, txt, panel, pill, footer } from "./theme.mjs";
export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Organizacao", "O GESTISAC organiza a empresa por trabalho real, nao por menus soltos", "As seis janelas principais sao a camada de operacao diaria; os modulos administrativos continuam ligados por contexto.");
  const cx = 514, cy = 316;
  panel(ctx, slide, cx, cy, 250, 120, C.ink, C.ink);
  txt(ctx, slide, "Hoje", cx, cy + 24, 250, 34, { size: 30, bold: true, color: C.white, align: "center" });
  txt(ctx, slide, "centro de comando", cx, cy + 66, 250, 22, { size: 14, color: "#D6E4F0", align: "center" });
  const nodes = [
    ["Condominios", 152, 256, C.blue],
    ["Equipa", 420, 186, C.gold],
    ["Tarefas", 820, 186, C.green],
    ["Pedidos", 1030, 256, C.red],
    ["Agenda", 820, 476, C.blue],
    ["Documentos / Contabilidade / Relatorios", 244, 476, C.amber],
  ];
  for (const [label, x, y, color] of nodes) {
    panel(ctx, slide, x, y, 230, 84, C.white);
    ctx.addShape(slide, { x, y, w: 5, h: 84, fill: color, line: ctx.line(color, 0) });
    txt(ctx, slide, label, x + 16, y + 25, 198, 34, { size: 17, bold: true, color: C.ink, align: "center" });
  }
  pill(ctx, slide, "Cada clique abre contexto e relacoes", 470, 565, 340, C.sky, C.ink);
  footer(ctx, slide, 3);
  return slide;
}