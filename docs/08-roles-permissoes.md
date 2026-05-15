# Roles E Permissoes

## Roles Iniciais

### Super Admin

Gere tenants, configuracoes globais e acesso tecnico.

### Administrador

Gere condominios, utilizadores, configuracoes e operacao geral.

### Gestor Financeiro

Focado em contabilidade, pagamentos, despesas, dividas, recibos e relatorios financeiros.

### Gestor De Condominio

Gere residentes, fracoes, tickets, manutencoes, fornecedores e documentos do condominio.

### Suporte

Resolve tickets, acompanha incidentes e atualiza estados operacionais.

### Residente

Acede a area propria futura para documentos, pagamentos, tickets e assembleias.

## Principios

- Menor privilegio por defeito.
- Acoes financeiras exigem permissoes explicitas.
- Gestao de roles deve ser auditavel.
- O frontend deve esconder acoes indisponiveis, mas o backend deve validar sempre.

## Grupos De Permissao

- Condominios
- Contabilidade
- Administracao
- Documentos
- Relatorios
- Assembleias
- Utilizadores
- Configuracoes
