import { C, bg, title, txt, footer } from "./theme.mjs";
export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Arquitetura", "Tecnologia escolhida para rapidez, seguranca e evolucao", "A explicacao deve ser simples: app no browser, API robusta, dados estruturados e deploy controlado.");
  await ctx.addImage(slide, { path: "C:\\Users\\josefeio\\Desktop\\git\\gestisac\\output\\apresentacao-cliente-gestisac\\assets\\arquitetura-sistema.png", x: 60, y: 220, w: 1160, h: 435, fit: "contain", alt: "Diagrama de arquitetura GESTISAC" });
  footer(ctx, slide, 8);
  return slide;
}