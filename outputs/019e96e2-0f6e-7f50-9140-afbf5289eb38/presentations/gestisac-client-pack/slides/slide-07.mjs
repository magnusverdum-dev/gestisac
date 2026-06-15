import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Requisitos", "A matriz transforma a reuniao numa validacao concreta", "O objetivo e a cliente dizer o que fica, o que muda e o que falta.");
  const headers = ["Area", "Implementado", "Parcial", "Planeado / validar"];
  const data = [
    ["Acesso e perfis", "loginless demo, HQ/Worker/Client", "permissoes finas", "matriz de autoridade"],
    ["Operacao diaria", "Hoje, Tarefas, Pedidos, Agenda", "estados finais", "SLA e notificacoes"],
    ["Condominios", "lista e contexto", "ficha completa", "documentos oficiais"],
    ["Administrativo", "base tecnica", "documentos/manutencao", "contabilidade e relatorios"],
  ];
  let x = 86;
  for (const h of headers) {
    panel(ctx, slide, x, 252, h === "Area" ? 205 : 280, 48, C.ink, C.ink);
    txt(ctx, slide, h, x + 10, 266, h === "Area" ? 185 : 260, 20, { size: 14, bold: true, color: C.white, align: "center" });
    x += h === "Area" ? 205 : 280;
  }
  let y = 306;
  for (const row of data) {
    x = 86;
    for (let i = 0; i < row.length; i++) {
      const w = i === 0 ? 205 : 280;
      panel(ctx, slide, x, y, w, 74, i === 0 ? C.sky : C.white);
      txt(ctx, slide, row[i], x + 12, y + 16, w - 24, 38, { size: i === 0 ? 15 : 13, bold: i === 0, color: i === 0 ? C.ink : C.muted, align: i === 0 ? "center" : "left" });
      x += w;
    }
    y += 74;
  }
  footer(ctx, slide, 7);
  return slide;
}