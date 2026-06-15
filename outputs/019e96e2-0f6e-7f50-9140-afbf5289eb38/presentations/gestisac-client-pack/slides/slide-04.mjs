import { C, bg, title, txt, lane, footer } from "./theme.mjs";
export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Perfis", "A mesma base visual, tres experiencias com permissoes diferentes", "A cliente entende que a app nao mostra tudo a toda a gente.");
  lane(ctx, slide, "HQ / Administracao", "Acompanha indicadores, condominios, equipa, tarefas, pedidos e agenda. Decide, atribui e valida.", 90, 265, 340, 280, C.blue);
  lane(ctx, slide, "Funcionario", "Ve o que tem para executar: tarefas, pedidos e agenda. Atualiza progresso sem entrar em administracao.", 470, 265, 340, 280, C.green);
  lane(ctx, slide, "Cliente", "Consulta pedidos e eventos relevantes. Recebe transparencia sem expor dados internos da operacao.", 850, 265, 340, 280, C.gold);
  footer(ctx, slide, 4);
  return slide;
}