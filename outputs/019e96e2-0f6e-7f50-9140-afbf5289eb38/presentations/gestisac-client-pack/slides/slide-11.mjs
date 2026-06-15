import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide11(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Validacao", "As melhores perguntas desbloqueiam o contrato", "A matriz deve ser usada como instrumento de decisao, nao como anexo esquecido.");
  const questions = [
    "Quem pode aprovar, atribuir e fechar pedidos?",
    "Quais sao os estados oficiais e SLA por tipo de pedido?",
    "Que documentos sao obrigatorios e quem os pode ver?",
    "Que mapas financeiros e relatorios sao indispensaveis?",
    "Que notificacoes fazem sentido para clientes e equipa?",
    "Que dados historicos precisam de entrar no arranque?",
  ];
  let y = 252;
  for (let i = 0; i < questions.length; i++) {
    panel(ctx, slide, 130, y, 1020, 48, i % 2 === 0 ? C.white : C.sky);
    txt(ctx, slide, String(i + 1), 152, y + 12, 34, 24, { size: 17, bold: true, color: C.gold, align: "center" });
    txt(ctx, slide, questions[i], 205, y + 14, 870, 22, { size: 17, color: C.ink });
    y += 56;
  }
  footer(ctx, slide, 11);
  return slide;
}