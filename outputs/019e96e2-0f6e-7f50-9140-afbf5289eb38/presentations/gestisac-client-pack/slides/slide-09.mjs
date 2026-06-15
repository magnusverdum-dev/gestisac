import { C, bg, title, txt, lane, footer } from "./theme.mjs";
export async function slide09(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Seguranca e fiabilidade", "A demo e simples, mas a base tecnica respeita producao", "Separar demonstracao sem friccao de seguranca real e essencial na conversa.");
  lane(ctx, slide, "Seguranca", "Sem segredos no frontend. API centraliza regras. Perfis separam HQ, funcionario e cliente.", 90, 270, 340, 255, C.blue);
  lane(ctx, slide, "Dados", "PostgreSQL/Supabase guarda dados estruturados, relacionaveis e auditaveis.", 470, 270, 340, 255, C.green);
  lane(ctx, slide, "Operacao", "GitHub, Vercel, checks, smoke tests e warmup tornam deploy e validacao previsiveis.", 850, 270, 340, 255, C.gold);
  footer(ctx, slide, 9);
  return slide;
}