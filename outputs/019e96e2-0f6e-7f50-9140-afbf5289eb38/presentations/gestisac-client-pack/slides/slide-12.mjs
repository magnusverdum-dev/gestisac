import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide12(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Proximos passos", "Fechar contrato com uma fase controlada e criterios claros", "A proposta e transformar a demonstracao em piloto validado com dados e regras reais.");
  const steps = [
    ["1", "Validar matriz", "decisoes da cliente"],
    ["2", "Fechar escopo", "primeira fase contratual"],
    ["3", "Piloto real", "condominios e equipa"],
    ["4", "Go-live", "checks e aceitacao"],
  ];
  let x = 112;
  for (const [n, label, detail] of steps) {
    panel(ctx, slide, x, 300, 230, 160, C.paper);
    txt(ctx, slide, n, x + 22, 322, 50, 42, { size: 34, bold: true, color: C.gold });
    txt(ctx, slide, label, x + 22, 374, 185, 28, { size: 20, bold: true, color: C.ink });
    txt(ctx, slide, detail, x + 22, 414, 185, 24, { size: 15, color: C.muted });
    if (n !== "4") ctx.addShape(slide, { x: x + 242, y: 380, w: 45, h: 4, fill: C.blue, line: ctx.line(C.blue, 0) });
    x += 280;
  }
  txt(ctx, slide, "Fecho sugerido: aprovar piloto, confirmar requisitos obrigatorios e marcar arranque tecnico-operacional.", 130, 545, 980, 46, { size: 22, bold: true, color: C.ink, align: "center" });
  footer(ctx, slide, 12);
  return slide;
}