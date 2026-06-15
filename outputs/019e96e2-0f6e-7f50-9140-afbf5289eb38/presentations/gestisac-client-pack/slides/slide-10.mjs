import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide10(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Estado atual", "Separar feito, parcial e planeado evita promessas vagas", "Isto aumenta confianca: a cliente percebe exatamente onde esta o produto.");
  const cols = [
    ["Feito / demonstravel", C.green, "loginless demo; HQ / Worker / Client; menu limpo; Hoje, Equipa, Tarefas, Pedidos e Agenda; API publicada e checks"],
    ["Parcial / validar", C.amber, "ficha profunda de condominios; documentos; estados finais; auditoria detalhada; permissoes finas"],
    ["Planeado", C.blue, "contabilidade completa; relatorios executivos; notificacoes; integracoes; importacao historica"],
  ];
  let x = 94;
  for (const [label, color, body] of cols) {
    panel(ctx, slide, x, 262, 340, 300, C.paper);
    ctx.addShape(slide, { x, y: 262, w: 340, h: 9, fill: color, line: ctx.line(color, 0) });
    txt(ctx, slide, label, x + 20, 288, 300, 30, { size: 19, bold: true, color: C.ink });
    txt(ctx, slide, body, x + 22, 342, 286, 168, { size: 15, color: C.muted });
    x += 390;
  }
  footer(ctx, slide, 10);
  return slide;
}