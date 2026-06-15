import { C, bg, title, txt, metric, footer } from "./theme.mjs";
export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  txt(ctx, slide, "GESTISAC", 74, 70, 640, 72, { size: 54, bold: true, color: C.ink, face: ctx.fonts.title });
  txt(ctx, slide, "Operacao de condominios organizada, visivel e validavel", 78, 150, 780, 72, { size: 25, color: C.navy });
  txt(ctx, slide, "Pacote para fecho de contrato e validacao formal de requisitos", 80, 235, 720, 34, { size: 18, color: C.muted });
  metric(ctx, slide, "Janelas principais", "6", "Hoje, Condominios, Equipa, Tarefas, Pedidos, Agenda", 80, 365, 310, C.blue);
  metric(ctx, slide, "Perfis", "3", "HQ/Admin, Funcionario e Cliente", 420, 365, 310, C.gold);
  metric(ctx, slide, "Base tecnica", "Qwik + Rust + PostgreSQL", "PWA, API e dados estruturados", 760, 365, 390, C.green);
  txt(ctx, slide, "Reuniao: mostrar o que esta demonstravel, separar roadmap, e recolher decisoes da cliente.", 80, 520, 960, 44, { size: 20, color: C.ink, bold: true });
  footer(ctx, slide, 1);
  return slide;
}