from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT = "deliverables/notebooklm-gestisac/GESTISAC_Fonte_NotebookLM.pdf"

BLUE = colors.HexColor("#0c3557")
MID_BLUE = colors.HexColor("#174969")
LIGHT_BLUE = colors.HexColor("#eef8ff")
SKY = colors.HexColor("#49c3ff")
TEXT = colors.HexColor("#13202f")
MUTED = colors.HexColor("#526578")
GRID = colors.HexColor("#d7e2ec")
GREEN_BG = colors.HexColor("#dcf7e9")
GREEN = colors.HexColor("#095b37")
YELLOW_BG = colors.HexColor("#fff1cc")
YELLOW = colors.HexColor("#7a4b00")
RED_BG = colors.HexColor("#ffe0e4")
RED = colors.HexColor("#86323a")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=42,
        leading=44,
        textColor=colors.white,
        alignment=TA_LEFT,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "CoverSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=15,
        leading=20,
        textColor=colors.HexColor("#d9ecff"),
        spaceAfter=20,
    )
)
styles.add(
    ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=24,
        textColor=BLUE,
        spaceBefore=0,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13.5,
        leading=16,
        textColor=MID_BLUE,
        spaceBefore=12,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.8,
        leading=14,
        textColor=TEXT,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        "Lead",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=12.4,
        leading=17,
        textColor=colors.HexColor("#20364a"),
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=11,
        textColor=MUTED,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        "Cell",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=11,
        textColor=TEXT,
    )
)
styles.add(
    ParagraphStyle(
        "CellBold",
        parent=styles["Cell"],
        fontName="Helvetica-Bold",
        textColor=BLUE,
    )
)
styles.add(
    ParagraphStyle(
        "WhiteCell",
        parent=styles["Cell"],
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        "Quote",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=19,
        textColor=BLUE,
        leftIndent=8,
        borderColor=SKY,
        borderWidth=0,
        borderPadding=0,
        spaceAfter=12,
    )
)


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def bullet(items):
    data = []
    for item in items:
        data.append([Paragraph("•", styles["Body"]), p(item)])
    table = Table(data, colWidths=[6 * mm, 157 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("TEXTCOLOR", (0, 0), (0, -1), SKY),
            ]
        )
    )
    return table


def section(title, lead=None):
    flow = [p(title, "H1")]
    if lead:
        flow.append(p(lead, "Lead"))
    return flow


def note(text, title="Nota"):
    return Table(
        [[p(f"<b>{title}:</b> {text}", "Body")]],
        colWidths=[163 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#b9d6e8")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        ),
    )


def simple_table(headers, rows, widths=None, font_size=8.3):
    local_cell = ParagraphStyle(
        f"Cell{font_size}",
        parent=styles["Cell"],
        fontSize=font_size,
        leading=font_size + 2.6,
    )
    data = [[Paragraph(h, styles["WhiteCell"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(cell), local_cell) for cell in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), MID_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.45, GRID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ]
        )
    )
    return table


def card_grid(cards, cols=3):
    rows = []
    for i in range(0, len(cards), cols):
        row = []
        for title, body in cards[i : i + cols]:
            row.append([p(f"<b>{title}</b>", "CellBold"), p(body, "Cell")])
        while len(row) < cols:
            row.append("")
        rows.append(row)
    table = Table(rows, colWidths=[163 * mm / cols] * cols, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.45, GRID),
                ("INNERGRID", (0, 0), (-1, -1), 5, colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fbfd")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def flow_diagram(items, widths=None):
    cells = []
    for idx, (title, body) in enumerate(items):
        arrow = " &gt;" if idx < len(items) - 1 else ""
        cells.append(Paragraph(f"<b>{title}{arrow}</b><br/><font color='#526578'>{body}</font>", styles["Cell"]))
    table = Table([cells], colWidths=widths or [163 * mm / len(items)] * len(items))
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.55, colors.HexColor("#c7d8e5")),
                ("INNERGRID", (0, 0), (-1, -1), 2, colors.white),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fbfd")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def status(text):
    if text == "Feito":
        return f"<font color='#095b37'><b>{text}</b></font>"
    if text == "Parcial":
        return f"<font color='#7a4b00'><b>{text}</b></font>"
    return f"<font color='#86323a'><b>{text}</b></font>"


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#e3edf4"))
    canvas.line(17 * mm, 12 * mm, 193 * mm, 12 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#7d8c99"))
    canvas.drawString(17 * mm, 7.8 * mm, "GESTISAC")
    canvas.drawRightString(193 * mm, 7.8 * mm, f"Fonte NotebookLM · página {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#081c32"))
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#103f5e"))
    canvas.circle(178 * mm, 235 * mm, 54 * mm, stroke=0, fill=1)
    canvas.setFillColor(SKY)
    canvas.rect(18 * mm, 247 * mm, 48 * mm, 2 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#9bdcff"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, 236 * mm, "DOSSIER FONTE PARA NOTEBOOKLM")
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 42)
    canvas.drawString(18 * mm, 204 * mm, "GESTISAC")
    canvas.setFillColor(colors.HexColor("#d9ecff"))
    canvas.setFont("Helvetica", 15)
    text = canvas.beginText(18 * mm, 188 * mm)
    text.setLeading(20)
    for line in [
        "Apresentação completa do estado atual do programa,",
        "do que falta para o MVP total e da arquitetura explicada",
        "para pessoas sem perfil técnico.",
    ]:
        text.textLine(line)
    canvas.drawText(text)

    meta = [
        ("Objetivo", "Fonte para gerar slides, discurso, resumo executivo e perguntas."),
        ("Público", "Cliente, gestão, direção ou decisor não técnico."),
        ("Data", "11/06/2026"),
    ]
    x = 18 * mm
    y = 78 * mm
    w = 54 * mm
    for title, body in meta:
        canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.28))
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.08))
        canvas.roundRect(x, y, w, 28 * mm, 4 * mm, stroke=1, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(x + 4 * mm, y + 19 * mm, title)
        canvas.setFillColor(colors.HexColor("#d9ecff"))
        canvas.setFont("Helvetica", 8.2)
        tx = canvas.beginText(x + 4 * mm, y + 14 * mm)
        tx.setLeading(10)
        words = body.split()
        line = ""
        for word in words:
            candidate = (line + " " + word).strip()
            if canvas.stringWidth(candidate, "Helvetica", 8.2) > w - 8 * mm:
                tx.textLine(line)
                line = word
            else:
                line = candidate
        if line:
            tx.textLine(line)
        canvas.drawText(tx)
        x += 58 * mm
    canvas.setFillColor(colors.HexColor("#b8d8ef"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 8 * mm, "GESTISAC")
    canvas.drawRightString(192 * mm, 8 * mm, "Fonte NotebookLM")
    canvas.restoreState()


story = []
story.append(Spacer(1, 260 * mm))
story.append(PageBreak())

story += section(
    "Como Usar Este Documento",
    "Este PDF foi preparado para ser carregado no NotebookLM como fonte principal. O conteúdo está escrito em linguagem simples, com secções bem marcadas, para a ferramenta conseguir gerar explicações, slides, resumos e guiões de apresentação.",
)
story.append(
    note(
        'Depois de carregar este PDF, pode pedir: "Cria uma apresentação clara sobre o GESTISAC para uma pessoa que não percebe informática. Explica o que está feito, o que falta para o MVP total, as 3 apps e a arquitetura de forma visual e simples."',
        "Pedido recomendado ao NotebookLM",
    )
)
story.append(Spacer(1, 5 * mm))
story.append(
    simple_table(
        ["Índice"],
        [
            ["1. Resumo executivo · 2. Problema que resolve · 3. Visão do produto · 4. As 3 apps separadas"],
            ["5. Fluxo de avaria · 6. O que já está feito · 7. O que está parcial · 8. O que falta para o MVP"],
            ["9. Arquitetura simples · 10. Tecnologias · 11. Segurança · 12. Roteiro de demo"],
            ["13. Mensagens-chave · 14. Perguntas prováveis · 15. Glossário · 16. Prompts para NotebookLM"],
        ],
        widths=[163 * mm],
    )
)
story.append(
    note(
        "Este documento separa claramente o que está demonstrável, o que está em construção e o que ainda falta. A apresentação deve evitar vender como terminado aquilo que ainda está parcial ou planeado.",
        "Nota importante",
    )
)
story.append(PageBreak())

story += section("Resumo Executivo")
story.append(p("O GESTISAC transforma a gestão de condomínios numa operação visível: cada pedido entra no sistema, fica atribuído, é acompanhado e deixa histórico.", "Quote"))
story.append(p("O GESTISAC é uma plataforma para centralizar a gestão diária de condomínios. Em vez de ter informação espalhada por chamadas, emails, folhas Excel, mensagens e pastas soltas, o sistema cria um ponto único de organização."))
story.append(p("A proposta não é apenas criar mais uma aplicação. A proposta é criar uma mesa de comando para a empresa: ver condomínios, pedidos, tarefas, equipa, documentos, agenda e contabilidade num ambiente único."))
story.append(p("Ideia simples para explicar a qualquer pessoa", "H2"))
story.append(p("Imagine uma receção organizada. Tudo o que chega fica registado, cada assunto tem responsável, há prioridade, há estado, há histórico e sabe-se sempre o que está pendente. O GESTISAC é essa receção, mas em formato digital."))
story.append(p("O que já existe", "H2"))
story.append(
    bullet(
        [
            "Uma aplicação principal com dashboard e várias áreas de gestão.",
            "Separação inicial em três apps: administração, cliente e funcionário.",
            "API central online para guardar e servir informação.",
            "Base de dados real em PostgreSQL/Supabase.",
            "Fluxos iniciais para tickets, condomínios, documentos, agenda, tarefas, equipa e contabilidade base.",
        ]
    )
)
story.append(p("O que falta para o MVP total", "H2"))
story.append(
    bullet(
        [
            "Fechar os fluxos principais de ponta a ponta com casos reais.",
            "Consolidar permissões por perfil e separar totalmente o que cada app pode ver.",
            "Completar funcionalidades críticas como anexos, notificações, documentos finais, contabilidade operacional e relatórios.",
            "Validar em produção com smoke tests e uso real por HQ, Worker e Client.",
        ]
    )
)
story.append(PageBreak())

story += section(
    "Problema Que O Sistema Resolve",
    "A gestão de condomínios tem muitos pequenos assuntos que, quando estão espalhados, tornam-se difíceis de controlar.",
)
story.append(
    card_grid(
        [
            (
                "Situação atual comum",
                "Pedidos chegam por telefone, email, WhatsApp ou presencialmente. Nem sempre há histórico claro, é difícil saber quem ficou responsável e documentos ficam dispersos.",
            ),
            (
                "Situação pretendida",
                "Todos os pedidos entram no mesmo sistema. Cada pedido tem estado, prioridade e responsável. Cliente, administração e funcionário veem a informação adequada.",
            ),
        ],
        cols=2,
    )
)
story.append(p("Mensagem para reunião", "H2"))
story.append(p("O problema não é apenas ter uma app. O problema é ter controlo operacional. O GESTISAC serve para responder rapidamente a perguntas simples:"))
story.append(
    bullet(
        [
            "Que condomínios precisam de atenção hoje?",
            "Que pedidos estão abertos?",
            "Quem está responsável?",
            "O que já foi feito?",
            "O que ainda falta resolver?",
            "Que documentos, pagamentos ou decisões estão pendentes?",
        ]
    )
)

story += section(
    "Visão Do Produto",
    "O GESTISAC foi pensado para esconder a complexidade técnica e mostrar uma experiência simples: organização, controlo e confiança.",
)
story.append(
    flow_diagram(
        [
            ("Condomínios", "Prédios, frações, moradores, contactos e alertas."),
            ("Operação", "Pedidos, tickets, manutenção, tarefas e equipa."),
            ("Financeiro", "Quotas, pagamentos, dívidas, despesas e recibos."),
            ("Documentos", "Atas, relatórios, anexos, modelos e arquivo."),
        ]
    )
)
story.append(p("Regra central do produto", "H2"))
story.append(p("O sistema deve começar sempre por uma vista simples e visual. A pessoa vê primeiro o resumo, as prioridades e os avisos. Só depois entra nos detalhes, listas e registos."))
story.append(note("O dashboard é a mesa de trabalho. As páginas de detalhe são as gavetas organizadas.", "Forma simples de explicar"))
story.append(PageBreak())

story += section(
    "As 3 Apps Separadas",
    "O sistema não mostra a mesma coisa a toda a gente. Cada pessoa entra pela sua porta e vê apenas aquilo que precisa para trabalhar.",
)
story.append(
    flow_diagram(
        [
            ("HQ / Administração", "Gestão completa da operação, condomínios, equipa, tickets, documentos e visão financeira."),
            ("Client / Cliente", "Portal simples para reportar pedidos, acompanhar estados e consultar informação permitida."),
            ("Worker / Funcionário", "Fila de trabalho focada no terreno: tarefas atribuídas, urgentes, em curso e resolvidas."),
        ]
    )
)
story.append(
    simple_table(
        ["App", "Para quem é", "O que deve ver", "O que não deve ver"],
        [
            ["HQ", "Administração da empresa", "Gestão global, triagem, equipa, tarefas, contabilidade agregada, documentos e relatórios.", "Dados devem respeitar permissões internas e contexto autorizado."],
            ["Client", "Cliente, condómino ou representante", "Pedidos próprios, estados públicos, documentos permitidos e comunicação simples.", "Custos internos, notas técnicas, fornecedores internos, validação HQ e dados de outros clientes."],
            ["Worker", "Funcionário ou técnico no terreno", "Tarefas atribuídas, prioridades, local, instruções e ações de execução.", "Contabilidade, gestão global, dados administrativos sensíveis e informação fora da sua intervenção."],
        ],
        widths=[20 * mm, 33 * mm, 60 * mm, 50 * mm],
        font_size=7.8,
    )
)
story.append(note("A separação das 3 apps não é detalhe técnico. É uma decisão de produto: cada pessoa vê a sua área, com menos ruído e mais segurança.", "Mensagem-chave"))
story.append(PageBreak())

story += section(
    "Fluxo Simples: Uma Avaria",
    "Este é o melhor exemplo para apresentar o sistema a alguém sem perfil técnico, porque mostra a utilidade real das 3 apps.",
)
story.append(
    flow_diagram(
        [
            ("1. Cliente reporta", "Descreve a avaria e identifica local."),
            ("2. HQ recebe", "Vê prioridade, contexto e histórico."),
            ("3. HQ atribui", "Escolhe funcionário ou fornecedor."),
            ("4. Worker executa", "Atualiza estado no terreno."),
            ("5. Cliente acompanha", "Vê o progresso e confirmação."),
        ],
        widths=[32.6 * mm] * 5,
    )
)
story.append(p("Explicação em linguagem de reunião", "H2"))
story.append(p("Quando aparece uma avaria, ela deixa de viver numa chamada ou numa mensagem perdida. Passa a ter uma ficha no sistema. Essa ficha mostra quem pediu, onde é, qual o estado, quem ficou responsável e o que aconteceu até à resolução."))
story.append(p("Benefício prático", "H2"))
story.append(
    bullet(
        [
            "Menos chamadas repetidas para saber o estado.",
            "Menos risco de esquecer pedidos.",
            "Mais transparência para o cliente.",
            "Mais controlo para a administração.",
            "Mais clareza para o funcionário.",
            "Histórico guardado para futuras consultas.",
        ]
    )
)
story.append(note("O cliente comunica, a administração organiza, o funcionário executa e o sistema guarda o histórico.", "Frase curta"))
story.append(PageBreak())

story += section(
    "O Que Já Está Feito",
    "Estado atual resumido para apresentação. Esta lista deve ser tratada como base demonstrável ou já estruturada no projeto.",
)
feito_rows = [
    [status("Feito"), "Dashboard principal", "Vista inicial com indicadores, prioridades, avisos e entrada para os módulos principais."],
    [status("Feito"), "Condomínios", "Base para organizar condomínios, edifícios, frações, moradores e informação associada."],
    [status("Feito"), "Pedidos / Tickets", "Registo e acompanhamento de ocorrências, avarias, prioridades, estados e responsáveis."],
    [status("Feito"), "Equipa", "Vista de membros, carga operacional, tarefas abertas e validações pendentes."],
    [status("Feito"), "Tarefas", "Vista operacional para trabalho diário, com pedidos, manutenção, vistorias e agenda."],
    [status("Feito"), "Agenda", "Calendário operacional ligado a eventos, vistorias, reuniões, tickets e manutenção."],
    [status("Feito"), "Documentos", "Base para arquivo documental, modelos, documentos por condomínio e futuras gerações de PDF."],
    [status("Feito"), "Relatórios", "Área para relatórios, exportações, mapas e inteligência operacional."],
    [status("Feito"), "API central", "Motor que recebe pedidos das apps e comunica com a base de dados."],
    [status("Feito"), "Base de dados real", "PostgreSQL/Supabase como base preparada para produção e dados relacionais."],
    [status("Feito"), "Separação inicial das apps", "Existem apps próprias para HQ, Client e Worker, com contratos iniciais de API por contexto."],
]
story.append(simple_table(["Estado", "Área", "Descrição simples"], feito_rows, widths=[23 * mm, 44 * mm, 96 * mm], font_size=7.6))
story.append(note("Já existe uma fundação funcional e demonstrável. Agora o trabalho principal é fechar os fluxos reais, completar permissões e transformar a base atual num MVP totalmente pronto.", "Como dizer ao cliente"))
story.append(PageBreak())

story += section(
    "O Que Está Parcial Ou Em Consolidação",
    "Estas áreas já têm base, mas ainda precisam de fecho funcional, validação com casos reais ou polimento antes de serem tratadas como MVP total.",
)
partial_rows = [
    [status("Parcial"), "3 apps independentes", "HQ, Client e Worker existem como apps separadas.", "Garantir paridade, navegação final, deploy separado se necessário e contratos fechados."],
    [status("Parcial"), "Permissões", "Há contexto por app e regras iniciais de visibilidade.", "Fechar matriz de permissões real por perfil, cliente, condomínio e operação."],
    [status("Parcial"), "Contabilidade", "Existem módulos de quotas, pagamentos, dívidas, recibos, despesas e visão geral.", "Validar regras reais, reconciliação, recibos finais, exportações e privacidade por contexto."],
    [status("Parcial"), "Documentos", "Área documental e modelos estão mapeados.", "Completar upload, anexos, geração final, permissões, arquivo e versões."],
    [status("Parcial"), "Fluxo Worker", "Há visão de tarefas atribuídas e ações de execução previstas.", "Fechar uso no terreno: iniciar, pausar, pedir peças, anexar foto, resolver e submeter validação."],
    [status("Parcial"), "Fluxo Client", "Há visão simples para pedidos e acompanhamento.", "Fechar criação pública, anexos, comentários permitidos, notificações e documentos visíveis."],
    [status("Parcial"), "Produção", "Web e API estão publicadas e ligadas a base de dados real.", "Estabilizar deploys, smoke tests, ambientes, backups, monitorização e rotina de operação."],
]
story.append(simple_table(["Estado", "Área", "O que existe", "O que falta consolidar"], partial_rows, widths=[21 * mm, 34 * mm, 49 * mm, 59 * mm], font_size=7.3))
story.append(PageBreak())

story += section(
    "O Que Falta Para O MVP Total",
    "MVP total significa ter o ciclo principal do negócio a funcionar de forma fiável, simples e demonstrável em ambiente real.",
)
story.append(p("Critério simples de MVP", "H2"))
story.append(p("O MVP não precisa de ter todas as ideias futuras. Precisa de permitir que a empresa use o sistema nos fluxos essenciais sem depender de soluções paralelas."))
story.append(
    card_grid(
        [
            ("Essencial para MVP", "Login sem bloqueios; HQ gere pedidos e condomínios; Cliente abre e acompanha pedidos; Funcionário atualiza tarefas; documentos e anexos funcionam; permissões impedem fugas; produção estável."),
            ("Depois do MVP", "Automação avançada; IA; OCR documental; pagamentos integrados; assembleias digitais; analytics profundo; notificações inteligentes multicanal."),
        ],
        cols=2,
    )
)
faltas = [
    ["Alta", "Fechar ciclo de avarias ponta a ponta", "Cliente cria, HQ atribui, Worker resolve, Cliente confirma, HQ audita."],
    ["Alta", "Permissões finais", "Cada perfil vê apenas o que deve ver."],
    ["Alta", "Anexos e documentos reais", "Fotos, PDFs, atas, comprovativos e relatórios associados aos registos certos."],
    ["Alta", "Smoke tests por contexto", "Validar HQ, Worker e Client em produção, não apenas em localhost."],
    ["Média", "Contabilidade operacional", "Fechar regras de quotas, pagamentos, recibos, despesas e relatórios mínimos."],
    ["Média", "Notificações", "Avisar utilizadores quando há mudanças importantes."],
    ["Média", "Polimento visual e mobile", "Garantir experiência clara em desktop, tablet e telemóvel."],
]
story.append(simple_table(["Prioridade", "Falta", "Resultado esperado"], faltas, widths=[26 * mm, 53 * mm, 84 * mm], font_size=7.7))
story.append(PageBreak())

story += section(
    "Arquitetura Do Sistema, Explicada Simplesmente",
    "A arquitetura pode ser apresentada como uma cidade organizada: as pessoas entram pelas portas certas, o motor central trata dos pedidos e a base de dados guarda a informação.",
)
story.append(
    simple_table(
        ["Portas de entrada", "Motor central", "Onde fica guardado"],
        [
            ["HQ: administração<br/>Client: cliente/condómino<br/>Worker: funcionário", "GESTISAC API<br/>Regras, permissões, estados e comunicação entre apps", "Base de dados<br/>Documentos<br/>Histórico<br/>Publicação online"],
        ],
        widths=[50 * mm, 63 * mm, 50 * mm],
        font_size=8.4,
    )
)
story.append(p("Explicação para não técnicos", "H2"))
story.append(
    bullet(
        [
            "<b>Apps:</b> são as portas de entrada. Cada pessoa usa a porta adequada.",
            "<b>API:</b> é o balcão central. Recebe pedidos, aplica regras e responde.",
            "<b>Base de dados:</b> é o arquivo organizado. Guarda a informação de forma segura.",
            "<b>Documentos:</b> são os ficheiros ligados aos processos.",
            "<b>Publicação online:</b> permite aceder ao sistema por browser, sem instalar programas tradicionais.",
        ]
    )
)
story.append(note("As apps mostram a informação, a API decide e organiza, a base de dados guarda.", "Frase simples"))

story += section("Arquitetura Visual Em Modo Sistema")
story.append(
    flow_diagram(
        [
            ("Utilizador", "Abre a app certa"),
            ("App", "Mostra e recolhe informação"),
            ("Motor central", "Aplica regras e permissões"),
            ("Arquivo digital", "Guarda dados e histórico"),
            ("Resposta", "Mostra estado atualizado"),
        ],
        widths=[32.6 * mm] * 5,
    )
)
story.append(
    simple_table(
        ["Camada", "Nome simples", "Função", "Exemplo"],
        [
            ["Frontend", "O que a pessoa vê", "Ecrãs, botões, listas, dashboards e formulários.", "HQ, Client e Worker."],
            ["Backend/API", "Motor central", "Recebe pedidos, valida regras, calcula respostas e protege dados.", "Endpoints de dashboard, tickets e sessão."],
            ["Base de dados", "Arquivo organizado", "Guarda informação com relações entre entidades.", "Condomínios, frações, moradores, tickets, quotas."],
            ["Deploy", "Publicação online", "Permite que a aplicação esteja acessível por browser.", "Web e API publicados online."],
        ],
        widths=[24 * mm, 36 * mm, 65 * mm, 38 * mm],
        font_size=7.5,
    )
)
story.append(PageBreak())

story += section(
    "Tecnologias Escolhidas, Explicadas Sem Complicar",
    "A tecnologia não deve ser o centro da apresentação. Deve aparecer apenas como garantia de que o sistema foi feito com uma base moderna, segura e preparada para crescer.",
)
tech_rows = [
    ["Qwik", "Tecnologia para construir as páginas que o utilizador vê.", "Foi escolhida para criar uma experiência rápida, moderna e leve no browser."],
    ["Rust", "Linguagem usada no motor central/API.", "Foi escolhida pela estabilidade, segurança e previsibilidade em sistemas que tratam dados importantes."],
    ["PostgreSQL / Supabase", "Base de dados onde a informação fica organizada.", "Foi escolhida porque condomínios, frações, moradores, quotas, pagamentos e tickets têm muitas ligações entre si."],
    ["Vercel", "Serviço para publicar a aplicação online.", "Foi escolhido para disponibilizar web e API com rapidez, HTTPS e deploy mais simples."],
    ["Packages partilhados", "Peças comuns reutilizadas entre apps.", "Permitem manter consistência entre HQ, Client e Worker sem copiar lógica em vários sítios."],
]
story.append(simple_table(["Tecnologia", "Explicação simples", "Porque foi escolhida"], tech_rows, widths=[34 * mm, 58 * mm, 71 * mm], font_size=7.7))
story.append(note("Não escolhemos tecnologia por moda. Escolhemos uma base que permite rapidez, segurança, separação de responsabilidades e crescimento futuro.", "Mensagem recomendada"))
story.append(p("O que não dizer em excesso", "H2"))
story.append(bullet(["Não explicar rotas, endpoints ou estruturas internas se a pessoa não for técnica.", "Não começar por nomes de frameworks.", "Não transformar a reunião numa demonstração de código."]))
story.append(PageBreak())

story += section(
    "Segurança, Perfis E Permissões",
    "Segurança aqui significa uma ideia simples: cada pessoa só deve ver aquilo que precisa e tem autorização para ver.",
)
story.append(
    card_grid(
        [
            ("HQ", "Vê a gestão da operação, mas ainda assim deve respeitar permissões internas e contexto financeiro autorizado."),
            ("Client", "Vê apenas pedidos, documentos e estados que lhe dizem respeito. Não deve ver notas internas nem custos sensíveis."),
            ("Worker", "Vê apenas tarefas atribuídas e informação necessária para executar o trabalho no terreno."),
        ],
        cols=3,
    )
)
story.append(p("Guardrails importantes", "H2"))
story.append(
    bullet(
        [
            "O cliente não deve ver informação interna da administração.",
            "O funcionário não deve ver dados financeiros ou administrativos que não precisa.",
            "A administração deve conseguir auditar histórico e decisões.",
            "A base de dados deve separar clientes/organizações por contexto.",
            "As permissões finais são uma parte crítica do MVP.",
        ]
    )
)
story.append(note("O sistema não é só para guardar dados. É para mostrar a informação certa à pessoa certa.", "Frase para reunião"))

story += section("Funcionalidades Por Área", "Lista organizada para o NotebookLM conseguir transformar em slides, checklist ou matriz de requisitos.")
func_rows = [
    ["Dashboard", "Indicadores, avisos, prioridades, atalhos, estado geral.", "Ajuda a perceber rapidamente o que exige atenção."],
    ["Condomínios", "Condomínios, edifícios, frações, moradores, contactos e alertas.", "Centraliza a base da operação."],
    ["Pedidos", "Tickets, ocorrências, avarias, estado, prioridade, responsável e histórico.", "Evita pedidos perdidos e melhora acompanhamento."],
    ["Equipa", "Membros, carga de trabalho, tarefas abertas e validações.", "Ajuda a distribuir trabalho e controlar execução."],
    ["Tarefas", "Vista do trabalho diário, manutenção, vistorias e agenda.", "Transforma pedidos em ações concretas."],
    ["Agenda", "Eventos, vistorias, reuniões, emails planeados, manutenção.", "Dá visibilidade ao planeamento."],
    ["Contabilidade", "Quotas, pagamentos, dívidas, recibos, despesas, fundo de reserva.", "Mostra saúde financeira e pendências."],
    ["Documentos", "Arquivo, anexos, modelos, atas, relatórios e documentos por condomínio.", "Reduz dispersão documental."],
    ["Relatórios", "Relatórios financeiros, exportações, mapas e análises.", "Ajuda a prestar contas e tomar decisões."],
]
story.append(simple_table(["Área", "Funcionalidades", "Valor para o negócio"], func_rows, widths=[32 * mm, 77 * mm, 54 * mm], font_size=7.5))
story.append(PageBreak())

story += section(
    "Roteiro De Demonstração",
    "A demo deve ser curta, concreta e baseada numa história. Não deve começar por menus nem por tecnologia.",
)
story.append(p("Demo recomendada em 10 minutos", "H2"))
demo_steps = [
    "<b>Abrir HQ:</b> mostrar o dashboard, indicadores e prioridades.",
    "<b>Mostrar condomínios:</b> escolher um condomínio e explicar que tudo fica ligado a ele.",
    "<b>Abrir pedidos:</b> mostrar uma ocorrência com estado, responsável e histórico.",
    "<b>Mostrar equipa:</b> explicar carga de trabalho e validações pendentes.",
    "<b>Mostrar tarefas:</b> filtrar por hoje, em curso, validação ou atrasadas.",
    "<b>Mostrar agenda:</b> ligar pedidos e tarefas ao planeamento.",
    "<b>Abrir Worker:</b> mostrar que o funcionário vê apenas a sua fila de trabalho.",
    "<b>Abrir Client:</b> mostrar que o cliente acompanha o que lhe diz respeito.",
    "<b>Fechar com MVP:</b> listar feito, parcial e falta.",
]
story.append(bullet(demo_steps))
story.append(p("Demo ideal das 3 apps", "H2"))
story.append(flow_diagram([("Cliente", "Abre avaria"), ("HQ", "Recebe e atribui"), ("Worker", "Executa"), ("Cliente", "Confirma"), ("HQ", "Valida histórico")], widths=[32.6 * mm] * 5))
story.append(note("O mesmo pedido atravessa as 3 apps, mas cada pessoa vê a sua parte do processo.", "Mensagem-chave"))
story.append(PageBreak())

story += section(
    "Estrutura Sugerida Para Slides",
    "Se o NotebookLM gerar slides, esta é a sequência recomendada para uma apresentação clara.",
)
slides = [
    ["1", "GESTISAC", "Gestão de condomínios mais simples, organizada e visível."],
    ["2", "O problema atual", "Informação espalhada cria perda de controlo."],
    ["3", "A solução", "Um sistema central para acompanhar operação, documentos e responsabilidades."],
    ["4", "As 3 apps", "Administração, cliente e funcionário têm experiências separadas."],
    ["5", "Exemplo de avaria", "Cliente reporta, HQ atribui, Worker resolve, cliente acompanha."],
    ["6", "O que já está feito", "Dashboard, módulos base, API, base de dados e separação inicial."],
    ["7", "O que falta", "Fluxos finais, permissões, documentos, notificações, testes e polimento."],
    ["8", "Arquitetura simples", "Apps mostram, motor central organiza, base de dados guarda."],
    ["9", "Tecnologia escolhida", "Base moderna para rapidez, segurança e crescimento."],
    ["10", "Próximos passos", "Validar MVP com casos reais e fechar prioridades."],
]
story.append(simple_table(["Slide", "Título", "Mensagem principal"], slides, widths=[16 * mm, 43 * mm, 104 * mm], font_size=7.7))
story.append(p("Frase de abertura", "H2"))
story.append(p("Hoje vamos mostrar como o GESTISAC organiza o trabalho diário da gestão de condomínios: o que já está construído, o que ainda falta fechar e como as três apps trabalham em conjunto.", "Quote"))
story.append(p("Frase de fecho", "H2"))
story.append(p("O objetivo do MVP total é simples: cliente comunica, administração gere, funcionário executa, e tudo fica registado com segurança.", "Quote"))
story.append(PageBreak())

story += section("Mensagens-Chave Para Reunião", "Estas frases podem ser usadas diretamente numa apresentação, proposta ou conversa com decisores.")
story.append(p("Sobre o produto", "H2"))
story.append(bullet(["O GESTISAC centraliza a gestão operacional, financeira, documental e administrativa dos condomínios.", "A plataforma foi desenhada para dar controlo sem obrigar o utilizador a perceber tecnologia.", "A primeira vista deve responder à pergunta: o que precisa de atenção hoje?"]))
story.append(p("Sobre as 3 apps", "H2"))
story.append(bullet(["A administração tem uma visão completa para gerir.", "O cliente tem uma experiência simples para comunicar e acompanhar.", "O funcionário tem uma fila de trabalho clara para executar."]))
story.append(p("Sobre o estado atual", "H2"))
story.append(bullet(["Já existe uma fundação funcional e demonstrável.", "O sistema já tem estrutura online, API central e base de dados real.", "O que falta é fechar os fluxos críticos do MVP e validar com casos reais."]))
story.append(p("Sobre tecnologia", "H2"))
story.append(bullet(["A tecnologia foi escolhida para dar rapidez, segurança e capacidade de crescimento.", "A pessoa usa a aplicação; a complexidade fica escondida no motor central."]))
story.append(PageBreak())

story += section("Perguntas Prováveis E Respostas Simples")
qa_rows = [
    ["O sistema já está pronto?", "Já existe uma base funcional e demonstrável. Para MVP total ainda falta fechar fluxos finais, permissões, documentos, notificações e validação com casos reais."],
    ["Porque existem 3 apps?", "Porque a administração, o cliente e o funcionário não precisam de ver a mesma coisa. Separar melhora clareza, segurança e experiência de uso."],
    ["O cliente vê dados internos?", "Não deve ver. A app cliente deve mostrar apenas pedidos, estados e documentos autorizados."],
    ["Funciona online?", "Sim, existe estrutura online com web, API e base de dados real. Ainda é necessário continuar a estabilizar e validar produção para o MVP."],
    ["Porque não usar só Excel?", "Excel guarda informação, mas não organiza fluxos, responsabilidades, permissões, histórico, clientes e funcionários em tempo real."],
    ["O que é mais importante acabar primeiro?", "O ciclo de avarias/pedidos ponta a ponta, permissões, documentos/anexos e smoke tests por HQ, Worker e Client."],
    ["Isto pode crescer no futuro?", "Sim. A arquitetura foi pensada para crescer com novas automações, IA, notificações, pagamentos e analytics."],
]
story.append(simple_table(["Pergunta", "Resposta recomendada"], qa_rows, widths=[55 * mm, 108 * mm], font_size=7.8))
story.append(PageBreak())

story += section("Glossário Para Pessoas Não Técnicas", "Termos que podem aparecer numa reunião, explicados de forma simples.")
gloss = [
    ["App", "Área do sistema usada por um tipo de pessoa: administração, cliente ou funcionário."],
    ["Dashboard", "Ecrã inicial que mostra o estado geral e o que precisa de atenção."],
    ["Ticket", "Registo de um pedido, avaria ou ocorrência."],
    ["API", "Motor central que recebe pedidos das apps e responde com informação segura."],
    ["Base de dados", "Arquivo organizado onde ficam guardados os dados do sistema."],
    ["Permissões", "Regras que definem quem pode ver ou alterar cada coisa."],
    ["MVP", "Primeira versão realmente utilizável, com o essencial a funcionar bem."],
    ["Deploy", "Publicar a aplicação online para poder ser usada por browser."],
    ["Smoke test", "Teste rápido para confirmar que os fluxos principais continuam a funcionar."],
    ["PostgreSQL", "Base de dados robusta, usada para guardar informação estruturada."],
]
story.append(simple_table(["Termo", "Explicação simples"], gloss, widths=[42 * mm, 121 * mm], font_size=8.0))
story.append(PageBreak())

story += section("Prompts Úteis Para NotebookLM", "Depois de carregar este PDF no NotebookLM, estes pedidos ajudam a transformar a fonte em materiais de apresentação.")
prompt_rows = [
    ["Slides", "Cria uma apresentação de 10 slides sobre o GESTISAC para uma pessoa que não percebe informática."],
    ["Slides", "Faz uma versão visual e simples, com pouco texto por slide, sobre o que está feito e o que falta para o MVP."],
    ["Slides", "Cria uma apresentação focada nas 3 apps: HQ, Client e Worker."],
    ["Discurso", "Cria um guião de fala de 5 minutos para apresentar o GESTISAC a um decisor não técnico."],
    ["Discurso", "Cria uma versão mais comercial e uma versão mais operacional da apresentação."],
    ["Perguntas", "Lista as perguntas difíceis que um cliente pode fazer sobre este projeto e sugere respostas simples."],
    ["Matriz", "Cria uma matriz feito, parcial, falta para validação em reunião."],
    ["Documento", "Cria um resumo executivo de uma página."],
    ["Documento", "Cria uma checklist do que falta para o MVP total."],
    ["Email", "Cria um email de envio para acompanhar esta apresentação."],
]
story.append(simple_table(["Uso", "Prompt"], prompt_rows, widths=[30 * mm, 133 * mm], font_size=8.0))
story.append(PageBreak())

story += section("Resumo Final Para A Apresentação")
story.append(p("O GESTISAC já tem a fundação de uma plataforma de gestão de condomínios: apps, dashboard, módulos principais, API e base de dados. O foco agora é fechar o MVP total com fluxos reais, permissões, documentos, testes e polimento.", "Quote"))
story.append(card_grid([("Feito", "Base funcional, módulos principais, API, base de dados real e separação inicial das 3 apps."), ("Parcial", "Fluxos das 3 apps, permissões, contabilidade, documentos e produção precisam de consolidação."), ("Falta", "Fechar MVP ponta a ponta, validar em produção, estabilizar uso real e preparar entrega final.")], cols=3))
story.append(p("Mensagem de encerramento", "H2"))
story.append(p("O caminho certo é apresentar o sistema como uma operação organizada, não como uma lista de ecrãs. A pessoa deve sair da reunião a perceber três coisas: o que o sistema resolve, como as três apps trabalham juntas e o que falta para chegar ao MVP total."))
story.append(p("Fontes internas usadas para este dossier", "H2"))
story.append(
    bullet(
        [
            "docs/00-visao-geral.md",
            "docs/01-produto-e-modulos.md",
            "docs/09-roadmap.md",
            "docs/24-app-separation-postgres-roadmap.md",
            "docs/31-demo-3-apps-runbook.md",
            "docs/35-arquitetura-sistema-base-dados-fluxos.md",
            "output/apresentacao-cliente-gestisac/GESTISAC_Roteiro_Demo.md",
        ]
    )
)


doc = SimpleDocTemplate(
    OUT,
    pagesize=A4,
    rightMargin=17 * mm,
    leftMargin=17 * mm,
    topMargin=16 * mm,
    bottomMargin=16 * mm,
    title="GESTISAC - Fonte NotebookLM",
    author="GESTISAC",
)
doc.build(story, onFirstPage=cover_page, onLaterPages=footer)
print(OUT)
