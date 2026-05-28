# Demo Cliente - GESTISAC

Data: 2026-05-28

## Links prontos

- HQ / Administracao: https://gestisac-web.vercel.app/hq/login
- App Funcionarios: https://gestisac-web.vercel.app/worker/login
- App Clientes: https://gestisac-web.vercel.app/client/login
- API publica: https://gestisac-api.vercel.app/health

## Credenciais

```text
Email: admin@gestisac.pt
Password: Gestisac2026!
```

## Estrutura para apresentar

1. Dashboard
   - Visao geral do portfolio de condominios.
   - Alertas, ocorrencias, quotas e atalhos operacionais.

2. Condominios
   - Cadastro central dos condominios.
   - Perfil, blocos, pisos, zonas, equipamentos, contactos, documentos e historico.

3. Tickets / Ocorrencias
   - Pedidos, avarias e reclamacoes.
   - Prioridade, estado, responsavel, prazos e comentarios.

4. Manutencao
   - Intervencoes tecnicas e manutencao preventiva.
   - Ligacao a fornecedores, equipamentos e calendario.

5. Calendario
   - Vistorias, reunioes, emails planeados e tarefas operacionais.
   - Eventos ligados a tickets e manutencoes.

6. Documentos
   - Arquivo documental e modelos.
   - Geracao de documentos simples para assembleias, cobrancas e manutencao.

7. Contabilidade
   - Quotas, pagamentos, dividas, recibos, despesas e fundo de reserva.
   - Resumo financeiro por condominio.

8. Fornecedores
   - Rede de contactos tecnicos e administrativos.
   - Categorias, estado e dados de contacto.

## Roteiro rapido de 10 minutos

1. Abrir o HQ e entrar com as credenciais.
2. Mostrar o Dashboard como centro de comando.
3. Abrir Condominios e explicar que cada edificio tem perfil operacional completo.
4. Abrir Tickets para mostrar avarias/pedidos.
5. Abrir Manutencao e Calendario para mostrar planeamento.
6. Abrir Documentos e Contabilidade para fechar a parte administrativa.
7. Mostrar App Funcionarios e App Clientes como experiencias separadas por perfil.

## Estado tecnico para demo

- Frontend publicado na Vercel.
- API Rust publica ligada ao frontend.
- Login validado nos contextos `hq`, `worker` e `client`.
- Endpoints principais validados com token de sessao assinado.

## Nota de producao

Esta versao esta pronta para demonstracao. Para operar com dados reais de cliente,
o proximo passo e ligar a API a Postgres persistente e storage permanente para
documentos.
