import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Fluxo diario", "Da prioridade do dia ao historico auditavel", "O valor esta em ligar cada acao a um responsavel, a um estado e a um contexto.");
  const steps = [
    ["1", "Entrar", "sessao demo sem escrita manual"],
    ["2", "Priorizar", "Hoje mostra o que exige atencao"],
    ["3", "Atribuir", "pedido/tarefa ganha responsavel"],
    ["4", "Executar", "funcionario atualiza progresso"],
    ["5", "Validar", "administracao confirma resultado"],
    ["6", "Registar", "historico fica consultavel"],
  ];
  let x = 74;
  for (const [n, label, detail] of steps) {
    panel(ctx, slide, x, 290, 165, 165, C.white);
    txt(ctx, slide, n, x + 18, 306, 42, 42, { size: 30, bold: true, color: C.gold });
    txt(ctx, slide, label, x + 18, 354, 130, 26, { size: 18, bold: true, color: C.ink });
    txt(ctx, slide, detail, x + 18, 388, 128, 50, { size: 13, color: C.muted });
    if (n !== "6") ctx.addShape(slide, { x: x + 172, y: 366, w: 34, h: 4, fill: C.blue, line: ctx.line(C.blue, 0) });
    x += 190;
  }
  txt(ctx, slide, "Mensagem-chave: menos trabalho escondido, menos repeticao, mais controlo sobre o dia.", 94, 540, 980, 34, { size: 21, bold: true, color: C.ink });
  footer(ctx, slide, 5);
  return slide;
}