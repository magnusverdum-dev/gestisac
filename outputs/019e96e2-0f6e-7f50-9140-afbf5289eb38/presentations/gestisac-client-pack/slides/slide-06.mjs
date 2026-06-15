import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Demo", "As 6 janelas principais mostram a operacao completa", "A demo deve seguir esta ordem para contar uma historia simples.");
  const rows = [
    ["Hoje", "centro de comando", "Implementado"],
    ["Condominios", "ficha operacional e relacoes", "Parcial"],
    ["Equipa", "carga e atribuicoes", "Implementado"],
    ["Tarefas", "vista composta do trabalho", "Implementado"],
    ["Pedidos", "ciclo de acompanhamento", "Implementado"],
    ["Agenda", "planeamento e eventos", "Implementado"],
  ];
  let y = 250;
  for (const [area, desc, state] of rows) {
    panel(ctx, slide, 120, y, 1040, 54, y % 2 === 0 ? C.paper : C.white);
    txt(ctx, slide, area, 145, y + 14, 210, 24, { size: 18, bold: true, color: C.ink });
    txt(ctx, slide, desc, 385, y + 15, 460, 24, { size: 15, color: C.muted });
    const color = state === "Implementado" ? C.green : C.amber;
    txt(ctx, slide, state, 895, y + 13, 210, 24, { size: 15, bold: true, color, align: "right" });
    y += 60;
  }
  footer(ctx, slide, 6);
  return slide;
}