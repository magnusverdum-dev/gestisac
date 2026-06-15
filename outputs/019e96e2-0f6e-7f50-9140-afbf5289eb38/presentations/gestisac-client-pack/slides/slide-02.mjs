import { C, bg, title, txt, lane, footer } from "./theme.mjs";
export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Problema", "A operacao perde tempo quando a informacao vive fora do sistema", "O objetivo nao e ter mais uma app; e reduzir atrito diario e risco operacional.");
  lane(ctx, slide, "Pedidos dispersos", "Chamadas, WhatsApp, emails e notas dificultam dono, prioridade e historico.", 78, 270, 260, 250, C.red);
  lane(ctx, slide, "Equipa sem visibilidade", "A administracao nao ve facilmente carga, validacoes e atrasos por funcionario.", 370, 270, 260, 250, C.amber);
  lane(ctx, slide, "Dados desconectados", "Condominio, agenda, documentos, tarefas e contabilidade ficam em silos.", 662, 270, 260, 250, C.blue);
  lane(ctx, slide, "Cliente pergunta pelo estado", "Sem transparencia controlada, aumenta o trabalho manual de resposta.", 954, 270, 260, 250, C.green);
  footer(ctx, slide, 2);
  return slide;
}