import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "output", "apresentacao-cliente-gestisac");
const THREAD_ID = process.env.CODEX_THREAD_ID || "manual-gestisac-client-pack";
const WORKSPACE = path.join(ROOT, "outputs", THREAD_ID, "presentations", "gestisac-client-pack");
const SLIDES_DIR = path.join(WORKSPACE, "slides");
const PREVIEW_DIR = path.join(WORKSPACE, "preview");
const LAYOUT_DIR = path.join(WORKSPACE, "layout");
const QA_DIR = path.join(WORKSPACE, "qa");
const ASSET_DIR = path.join(OUT, "assets");
const FINAL_PPTX = path.join(OUT, "GESTISAC_Apresentacao_Executiva_Tecnica.pptx");
const CONTACT_SHEET = path.join(WORKSPACE, "contact-sheet.png");

const SKILL_DIR = "C:\\Users\\josefeio\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.601.10930\\skills\\presentations";
const PYTHON = "C:\\Users\\josefeio\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const slide = String.raw;

const theme = slide`
export const C = {
  ink: "#0B2545",
  navy: "#163B66",
  blue: "#2E74B5",
  sky: "#E8EEF5",
  line: "#CBD5E1",
  paper: "#F8FAFC",
  white: "#FFFFFF",
  muted: "#667085",
  gold: "#D7A84F",
  green: "#2E7D32",
  amber: "#B36B00",
  red: "#9B1C1C",
};

export function bg(slide, ctx, fill = C.paper) {
  ctx.addShape(slide, { x: 0, y: 0, w: ctx.W, h: ctx.H, fill, line: ctx.line(fill, 0) });
}

export function txt(ctx, slide, text, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text,
    x,
    y,
    w,
    h,
    fontSize: opts.size || 28,
    color: opts.color || C.ink,
    bold: opts.bold || false,
    align: opts.align || "left",
    valign: opts.valign || "top",
    fill: opts.fill || "#00000000",
    line: ctx.line(opts.line || "#00000000", opts.lineWidth || 0),
    insets: opts.insets || { left: 0, right: 0, top: 0, bottom: 0 },
    typeface: opts.face || ctx.fonts.body,
    name: opts.name,
  });
}

export function title(ctx, slide, kicker, headline, subtitle = "") {
  txt(ctx, slide, kicker.toUpperCase(), 72, 42, 720, 28, { size: 16, bold: true, color: C.gold });
  txt(ctx, slide, headline, 72, 78, 760, 92, { size: 38, bold: true, color: C.ink, face: ctx.fonts.title });
  if (subtitle) txt(ctx, slide, subtitle, 74, 168, 830, 54, { size: 20, color: C.muted });
}

export function footer(ctx, slide, n) {
  ctx.addShape(slide, { x: 72, y: 670, w: 1136, h: 1, fill: C.line, line: ctx.line(C.line, 0) });
  txt(ctx, slide, "GESTISAC | pacote executivo-tecnico", 72, 682, 520, 20, { size: 12, color: C.muted });
  txt(ctx, slide, String(n).padStart(2, "0"), 1165, 682, 44, 20, { size: 12, color: C.muted, align: "right" });
}

export function panel(ctx, slide, x, y, w, h, fill = C.white, line = C.line) {
  return ctx.addShape(slide, { x, y, w, h, fill, line: ctx.line(line, 1.2) });
}

export function metric(ctx, slide, label, value, detail, x, y, w, accent = C.blue) {
  panel(ctx, slide, x, y, w, 96, C.white);
  ctx.addShape(slide, { x, y, w: 6, h: 96, fill: accent, line: ctx.line(accent, 0) });
  txt(ctx, slide, value, x + 18, y + 16, w - 30, 28, { size: 26, bold: true, color: C.ink });
  txt(ctx, slide, label, x + 18, y + 48, w - 30, 20, { size: 13, bold: true, color: C.muted });
  txt(ctx, slide, detail, x + 18, y + 68, w - 30, 18, { size: 11, color: C.muted });
}

export function lane(ctx, slide, label, text, x, y, w, h, accent = C.blue) {
  panel(ctx, slide, x, y, w, h, C.white);
  ctx.addShape(slide, { x, y, w, h: 8, fill: accent, line: ctx.line(accent, 0) });
  txt(ctx, slide, label, x + 18, y + 18, w - 36, 30, { size: 19, bold: true, color: C.ink });
  txt(ctx, slide, text, x + 18, y + 56, w - 36, h - 68, { size: 15, color: C.muted, insets: { left: 0, right: 0, top: 0, bottom: 0 } });
}

export function pill(ctx, slide, label, x, y, w, fill = C.sky, color = C.ink) {
  ctx.addShape(slide, { x, y, w, h: 34, fill, line: ctx.line(C.line, 1) });
  txt(ctx, slide, label, x, y + 8, w, 18, { size: 13, bold: true, color, align: "center" });
}
`;

const slides = [
  slide`
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
}`,
  slide`
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
}`,
  slide`
import { C, bg, title, txt, panel, pill, footer } from "./theme.mjs";
export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.paper);
  title(ctx, slide, "Organizacao", "O GESTISAC organiza a empresa por trabalho real, nao por menus soltos", "As seis janelas principais sao a camada de operacao diaria; os modulos administrativos continuam ligados por contexto.");
  const cx = 514, cy = 316;
  panel(ctx, slide, cx, cy, 250, 120, C.ink, C.ink);
  txt(ctx, slide, "Hoje", cx, cy + 24, 250, 34, { size: 30, bold: true, color: C.white, align: "center" });
  txt(ctx, slide, "centro de comando", cx, cy + 66, 250, 22, { size: 14, color: "#D6E4F0", align: "center" });
  const nodes = [
    ["Condominios", 152, 256, C.blue],
    ["Equipa", 420, 186, C.gold],
    ["Tarefas", 820, 186, C.green],
    ["Pedidos", 1030, 256, C.red],
    ["Agenda", 820, 476, C.blue],
    ["Documentos / Contabilidade / Relatorios", 244, 476, C.amber],
  ];
  for (const [label, x, y, color] of nodes) {
    panel(ctx, slide, x, y, 230, 84, C.white);
    ctx.addShape(slide, { x, y, w: 5, h: 84, fill: color, line: ctx.line(color, 0) });
    txt(ctx, slide, label, x + 16, y + 25, 198, 34, { size: 17, bold: true, color: C.ink, align: "center" });
  }
  pill(ctx, slide, "Cada clique abre contexto e relacoes", 470, 565, 340, C.sky, C.ink);
  footer(ctx, slide, 3);
  return slide;
}`,
  slide`
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
}`,
  slide`
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
}`,
  slide`
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
}`,
  slide`
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
}`,
  slide`
import { C, bg, title, txt, footer } from "./theme.mjs";
export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Arquitetura", "Tecnologia escolhida para rapidez, seguranca e evolucao", "A explicacao deve ser simples: app no browser, API robusta, dados estruturados e deploy controlado.");
  await ctx.addImage(slide, { path: "${path.join(ASSET_DIR, "arquitetura-sistema.png").replaceAll("\\", "\\\\")}", x: 60, y: 220, w: 1160, h: 435, fit: "contain", alt: "Diagrama de arquitetura GESTISAC" });
  footer(ctx, slide, 8);
  return slide;
}`,
  slide`
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
}`,
  slide`
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
}`,
  slide`
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
}`,
  slide`
import { C, bg, title, txt, panel, footer } from "./theme.mjs";
export async function slide12(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  title(ctx, slide, "Proximos passos", "Fechar contrato com uma fase controlada e criterios claros", "A proposta e transformar a demonstracao em piloto validado com dados e regras reais.");
  const steps = [
    ["1", "Validar matriz", "decisoes da cliente"],
    ["2", "Fechar escopo", "primeira fase contratual"],
    ["3", "Piloto real", "condominios e equipa"],
    ["4", "Go-live", "checks e aceitacao"],
  ];
  let x = 112;
  for (const [n, label, detail] of steps) {
    panel(ctx, slide, x, 300, 230, 160, C.paper);
    txt(ctx, slide, n, x + 22, 322, 50, 42, { size: 34, bold: true, color: C.gold });
    txt(ctx, slide, label, x + 22, 374, 185, 28, { size: 20, bold: true, color: C.ink });
    txt(ctx, slide, detail, x + 22, 414, 185, 24, { size: 15, color: C.muted });
    if (n !== "4") ctx.addShape(slide, { x: x + 242, y: 380, w: 45, h: 4, fill: C.blue, line: ctx.line(C.blue, 0) });
    x += 280;
  }
  txt(ctx, slide, "Fecho sugerido: aprovar piloto, confirmar requisitos obrigatorios e marcar arranque tecnico-operacional.", 130, 545, 980, 46, { size: 22, bold: true, color: C.ink, align: "center" });
  footer(ctx, slide, 12);
  return slide;
}`,
];

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.trimStart(), "utf8");
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(SLIDES_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  await writeFile(path.join(WORKSPACE, "profile-plan.txt"), `
task mode: create
primary deck-profile: product-platform
secondary gates: engineering-platform for architecture and production readiness
required proof objects: workflow map, profile separation, requirements matrix, architecture diagram, status/roadmap
source requirements: local product docs and published app links supplied in project context
known missing inputs: final client-specific permission rules, accounting formats, notification channels
`);

  await writeFile(path.join(WORKSPACE, "contact-sheet-plan.txt"), `
1 cover with metric rail
2 operational pain lanes
3 product system map
4 profile lanes
5 daily workflow timeline
6 demo table
7 requirements matrix
8 architecture visual
9 security/data/reliability lanes
10 status roadmap columns
11 validation question list
12 next-step sequence
`);

  await writeFile(path.join(SLIDES_DIR, "theme.mjs"), theme);
  for (let index = 0; index < slides.length; index += 1) {
    await writeFile(path.join(SLIDES_DIR, `slide-${String(index + 1).padStart(2, "0")}.mjs`), slides[index]);
  }

  const builder = path.join(SKILL_DIR, "scripts", "build_artifact_deck.mjs");
  const result = spawnSync(
    process.execPath,
    [
      builder,
      "--workspace",
      WORKSPACE,
      "--slides-dir",
      SLIDES_DIR,
      "--out",
      FINAL_PPTX,
      "--preview-dir",
      PREVIEW_DIR,
      "--layout-dir",
      LAYOUT_DIR,
      "--contact-sheet",
      CONTACT_SHEET,
      "--slide-count",
      "12",
      "--scale",
      "1",
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PYTHON,
        HOME: "C:\\Users\\josefeio",
        USERPROFILE: "C:\\Users\\josefeio",
      },
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(result.stdout);
  console.log(JSON.stringify({ pptx: FINAL_PPTX, previewDir: PREVIEW_DIR, contactSheet: CONTACT_SHEET }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
