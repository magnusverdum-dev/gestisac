# Rust Best Practices Para O Backend GESTISAC

Este documento define o standard Rust para `apps/api`. Deve ser usado sempre que forem criados endpoints, modelos, servicos, repositorios, migrations ou integracoes.

## Regras Base

- Escrever Rust idiomatico, seguro e simples.
- Preferir `Result<T, E>` para falhas e `Option<T>` para ausencia.
- Usar tipos fortes para identificadores e conceitos importantes.
- Evitar `unwrap()`, `expect()` sem mensagem util e `panic!()` em codigo de producao.
- Propagar erros com `?` e converter para erros HTTP apenas na camada de API.
- Manter `main.rs` pequeno; a logica deve viver em modulos de dominio.
- Nao introduzir `unsafe` sem justificacao tecnica, comentario `SAFETY` e testes.

## Organizacao Recomendada

Para a fase funcional do backend, a estrutura deve evoluir para algo proximo de:

```text
apps/api/src/
  main.rs
  config.rs
  error.rs
  state.rs
  auth/
  models/
  repositories/
  services/
  routes/
  storage/
```

Responsabilidades:

- `routes/`: HTTP, extractors, DTOs de request/response e status codes.
- `services/`: regras de negocio, validacao de dominio e coordenacao de repositorios.
- `repositories/`: persistencia e queries SQLx.
- `models/`: tipos de dominio, ids fortes, enums e entidades.
- `auth/`: login, tokens, password hashing, permissoes e current user.
- `storage/`: interface para ficheiros S3-compatible.
- `error.rs`: erro central da aplicacao e conversao para resposta JSON.

## APIs E Tipos

- Evitar funcoes publicas com muitos argumentos soltos.
- Preferir structs de input como `CreateCondominiumInput` ou `CreateTicketInput`.
- Evitar booleanos ambiguos em APIs publicas.
- Usar enums para estados conhecidos, como `TicketPriority`, `TicketStatus`, `DocumentStatus`.
- Manter campos privados quando a entidade tiver invariantes internas.
- Expor metodos claros em vez de detalhes internos.

Exemplo:

```rust
pub struct CreateTicketInput {
    pub condominium_id: CondominiumId,
    pub title: String,
    pub priority: TicketPriority,
}
```

## Erros

Usar um erro central, por exemplo `AppError`, com variantes separadas para:

- `Validation`.
- `Unauthorized`.
- `Forbidden`.
- `NotFound`.
- `Conflict`.
- `Database`.
- `Storage`.
- `Internal`.

Regras:

- O frontend deve receber JSON consistente.
- Erros internos nao devem expor detalhes sensiveis.
- Erros de validacao devem explicar o campo e o problema.
- Nunca ignorar `Result`.
- Nao transformar tudo em `String`; preservar contexto enquanto fizer sentido.

## Async E Concorrencia

- Usar async para I/O: HTTP, base de dados, storage e Redis.
- Nao bloquear dentro de handlers async.
- Usar `tokio::time::sleep`, nunca `std::thread::sleep`, em contexto async.
- Usar `Arc` apenas para estado realmente partilhado.
- Evitar `Mutex` para esconder problemas de design; preferir DB, canais ou ownership claro.
- Tasks criadas com `tokio::spawn` devem tratar e registar erros.

## Dependencias

Antes de adicionar uma crate, confirmar:

- Necessidade real.
- Manutencao ativa.
- Popularidade/confianca.
- Compatibilidade com a stack.
- Se a standard library ou uma crate ja existente resolve o problema.

Dependencias aprovadas para a base atual:

- `axum`
- `tokio`
- `tower-http`
- `serde`
- `serde_json`
- `uuid`
- `chrono`
- `tracing`
- `tracing-subscriber`
- `thiserror`
- `anyhow`

Dependencias planeadas para backend real:

- `sqlx` para PostgreSQL.
- `argon2` para passwords.
- `jsonwebtoken` para JWT.
- `multer` para multipart uploads.
- SDK S3-compatible ou `object_store` para storage.

## Documentacao

- Toda API publica deve ter rustdoc com `///`.
- Documentar o que faz, quando usar, retorno e erros.
- Exemplos publicos devem compilar como doctests quando pratico.
- Documentar invariantes de tipos fortes e enums de dominio.

Modelo:

```rust
/// Creates a condominium for the authenticated tenant.
///
/// # Errors
///
/// Returns [`AppError::Validation`] when required fields are invalid.
/// Returns [`AppError::Forbidden`] when the user cannot manage condominiums.
pub async fn create_condominium(input: CreateCondominiumInput) -> Result<Condominium, AppError> {
    // ...
}
```

## Testes

Obrigatorio cobrir:

- Casos felizes principais.
- Validacoes.
- Erros de permissao.
- Erros de recurso inexistente.
- Calculos financeiros.
- Serializacao de DTOs criticos.

Preferencias:

- Testes unitarios para regras pequenas.
- Testes de integracao para fluxos HTTP e DB.
- Fakes/traits para storage e integracoes externas.
- Nomes de testes por comportamento, como `rejects_empty_email`.

## Checklist Antes De Entregar Rust

Executar:

```bash
pnpm run check:api
node scripts/run-cargo.mjs fmt --manifest-path apps/api/Cargo.toml -- --check
pnpm run clippy:api
pnpm run test:api
```

Confirmar:

- Sem `unwrap()` perigoso.
- Sem warnings do Clippy.
- Erros convertidos para respostas JSON consistentes.
- Handlers sem logica de negocio pesada.
- Tipos claros e nomes especificos.
- Testes proporcionais ao risco.
- Documentacao publica quando houver API publica nova.

## Revisao De Codigo Rust

Ao rever Rust neste projeto, classificar achados como:

- Critico: risco de bug, falha de seguranca ou perda de dados.
- Importante: prejudica manutencao, robustez ou clareza.
- Sugestao: melhoria de ergonomia, estilo ou organizacao.

Procurar especialmente:

- `unwrap()` e `expect()` fracos.
- Erros ignorados.
- Clones desnecessarios.
- DTOs confusos.
- Estados representados por strings soltas.
- Codigo async bloqueante.
- Modulos grandes demais.
- Dependencias sem justificacao.
- `unsafe` injustificado.
