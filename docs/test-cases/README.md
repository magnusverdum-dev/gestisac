# 🧪 GESTISAC — Test Case Inventory (Living Document)

**Owner**: Scrutator (Manual Tester Agent)  
**Last updated**: 2026-06-20  
**Version**: 1.1  
**Total test cases**: Tracked per-context below

This is the **living inventory** of every testable feature, button, form, and interaction across the GESTISAC platform. Scrutator maintains and updates this document as new features are added or existing ones change.

---

## Table of Contents

1. [Global / Shell (All Contexts)](#1-global--shell-all-contexts)
2. [HQ/Admin Context](#2-hqadmin-context)
3. [Worker/Funcionário Context](#3-workerfuncionário-context)
4. [Client/Resident Context](#4-clientresident-context)
5. [Auth & Session Flows](#5-auth--session-flows)
6. [Regression Test Matrix](#6-regression-test-matrix)

---

## 1. Global / Shell (All Contexts)

These elements appear in every context and must be tested once per context.

### 1.1 Sidebar

| # | Test Case | Type | Selector Hint | Expected Behaviour |
|---|-----------|------|---------------|-------------------|
| S1 | Sidebar renders with correct context logo | Visual | `.sidebar .brand` | Shows "GESTISAC — Gestao de Condominios" |
| S2 | Sidebar navigation items match context | Nav | `.sidebar .nav-list button` | HQ: 6 items · Worker: 4 items · Client: 3 items |
| S3 | Active nav item is highlighted | Nav | `.sidebar .nav-item.active` | Current page has `active` class |
| S4 | Click nav item navigates to page | Nav | `.sidebar .nav-item` | URL changes, page content loads |
| S5 | Mobile menu toggle (≤768px) | Nav | `.mobile-nav-toggle` | Toggles `mobile-open` class on `.nav-list` |
| S6 | Brand button triggers app switcher | Nav | `.brand-button` | Calls `onSwitchApp$` → navigates to app selection |

### 1.2 Topbar

| # | Test Case | Type | Selector Hint | Expected Behaviour |
|---|-----------|------|---------------|-------------------|
| T1 | Topbar renders with API status indicator | Visual | `.topbar` | Shows online/offline status |
| T2 | Back button navigates browser history | Button | `.back-button` | Calls `window.history.back()` |
| T3 | Search input accepts text | Input | `.search-box input` | Text appears, results filter in real-time |
| T4 | Search shows results dropdown | Interaction | `.search-box` | Typing shows filtered results (max 7) |
| T5 | Alert bell shows count | Visual | `.bell-icon` | Shows number of active alerts |
| T6 | Alert dropdown opens/closes | Interaction | `.bell-icon` | Click toggles alert list visibility |
| T7 | App context label shows correct context | Visual | `.topbar` | "HQ" / "Funcionarios" / "Clientes" |
| T8 | Logout button triggers logout | Button | `LogOutIcon` | Calls `onLogout$` → redirects to login |
| T9 | App switch button navigates to app grid | Button | `GridIcon` | Calls `onSwitchApp$` → app switcher screen |

### 1.3 AppShell Layout

| # | Test Case | Type | Expected Behaviour |
|---|-----------|------|-------------------|
| A1 | App shell renders sidebar + topbar + content | Visual | Three-region layout visible |
| A2 | Content slot renders page content | Visual | Page content appears in `.main-stage` area |
| A3 | Responsive layout at 1024px | Visual | Sidebar collapses, content fills width |
| A4 | Responsive layout at 375px (mobile) | Visual | Hamburger menu, stacked layout |

---

## 2. HQ/Admin Context

### 2.1 Dashboard (`/hq/dashboard`)

**Component**: `PageOverview.tsx` (via SPA), route migration exists

| # | Test Case | Type | Selector / Interaction | Expected |
|---|-----------|------|----------------------|----------|
| HQ-D1 | Dashboard loads summary cards | Data | `.metric-strip` or cards | 5+ summary cards with numbers |
| HQ-D2 | Dashboard loads alerts panel | Data | `.alerts` | Alert list visible, count matches bell |
| HQ-D3 | Quick action buttons render | Button | `.primary-action-bar` | Create condominium, ticket, etc. buttons |
| HQ-D4 | Click "New Ticket" navigates to tickets | Navigation | "Novo Pedido" button | Navigates to `/hq/tickets` with create intent |
| HQ-D5 | Global search from dashboard works | Search | Topbar search input | Results dropdown shows matches |
| HQ-D6 | Dashboard data refreshes on navigation | Data | Navigate away and back | Fresh data loads |

### 2.2 Tickets (`/hq/tickets`)

**Component**: `TicketsPage.tsx` — 850 lines

**Filters & Tabs**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T1 | Ticket list renders with data | Data | Page load | Table/list with ticket rows |
| HQ-T2 | Filter by type tab (todas/avaria/pedido) | Filter | Click `TIPO_TABS` | List filtered by type |
| HQ-T3 | Filter by status group (abertos/pendentes/resolvidos/fechados) | Filter | Click status tab | List filtered by status group |
| HQ-T4 | Filter by priority | Dropdown | Select `prioridadeFiltro` | List filtered by priority |
| HQ-T5 | Filter by condominium | Dropdown | Select `condominiumFiltro` | List filtered by condominium |
| HQ-T6 | Search by text | Input | `search` input | List filtered by search term |
| HQ-T7 | Combined filters work together | Filter | Multiple filters active | Correct intersection of filters |

**Ticket List**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T8 | Click ticket row selects it | Selection | Click row | `selectedId` updates, detail panel opens |
| HQ-T9 | Ticket row shows status badge | Visual | Inspect row | Status badge with correct colour |
| HQ-T10 | Ticket row shows priority indicator | Visual | Inspect row | Priority icon/colour visible |
| HQ-T11 | Empty state when no tickets match filters | State | Filter to no results | "Nenhum resultado" message |
| HQ-T12 | Tickets paginate (if > page size) | Navigation | Scroll/page control | More tickets load or pagination shown |

**Create Ticket**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T13 | Click "New Ticket" opens create form | Button | `PlusIcon` or "Novo" | Form/modal appears |
| HQ-T14 | Create form has all required fields | Form | Inspect form | Fields: title, type, priority, condominium, description |
| HQ-T15 | Create form validates required fields | Form | Submit empty form | Validation errors shown |
| HQ-T16 | Create form submits successfully | Form | Fill and submit | Ticket created, list refreshes |
| HQ-T17 | Create form cancels correctly | Form | Click cancel/close | Form closes, no side effects |

**Edit Ticket**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T18 | Click edit opens edit form | Button | `EditIcon` | Form pre-filled with ticket data |
| HQ-T19 | Edit form saves changes | Form | Modify and submit | Changes persisted, list refreshes |
| HQ-T20 | Edit form cancels correctly | Form | Click cancel | Form closes without changes |

**Delete Ticket**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T21 | Click delete shows confirmation | Button | `Trash2Icon` | Confirm dialog/modal appears |
| HQ-T22 | Confirm delete removes ticket | Action | Confirm | Ticket removed, list refreshes |
| HQ-T23 | Cancel delete keeps ticket | Action | Cancel | No change |

**Status Transitions**:

| # | Test Case | Type | Transition | Expected |
|---|-----------|------|------------|----------|
| HQ-T24 | Transition nova → emTriagem | Action | Select + confirm | Status updates, list refreshes |
| HQ-T25 | Transition emTriagem → emCurso | Action | Select + confirm | Status updates |
| HQ-T26 | Transition emCurso → pendente | Action | Select + confirm | Status updates |
| HQ-T27 | Transition emCurso → resolvida | Action | Resolve form + confirm | Status updates with resolution |
| HQ-T28 | Transition pendente → emCurso | Action | Select + confirm | Status updates |
| HQ-T29 | Transition resolvida → fechada | Action | Select + confirm | Status updates |
| HQ-T30 | Transition fechada → reaberta | Action | Select + confirm | Ticket reopens |
| HQ-T31 | Invalid transitions are disabled | State | Inspect available options | Only valid next statuses shown |

**Ticket Detail Tabs**:

| # | Test Case | Type | Tab | Expected |
|---|-----------|------|-----|----------|
| HQ-T32 | Detail "Resumo" tab renders | Tab | Click `resumo` | Summary info displayed |
| HQ-T33 | Detail "Checklist" tab renders | Tab | Click `checklist` | Checklist items visible |
| HQ-T34 | Detail "Fotos" tab renders | Tab | Click `fotos` | Photo gallery or upload area |
| HQ-T35 | Detail "Histórico" tab renders | Tab | Click `historico` | Status change history |
| HQ-T36 | Detail "Resolver" tab renders with form | Tab | Click `resolver` | Resolution form with fields |
| HQ-T37 | Detail "Timeline" tab renders | Tab | Click `timeline` | Chronological timeline |
| HQ-T38 | Detail "Ficheiros" tab renders | Tab | Click `ficheiros` | File attachments list |
| HQ-T39 | Detail "Custos" tab renders | Tab | Click `custos` | Cost breakdown |

**Comments**:

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-T40 | Toggle comment form | Button | Click comment icon | Form appears |
| HQ-T41 | Write and submit comment | Form | Type text, submit | Comment posted, list refreshes |
| HQ-T42 | Comment visibility toggle (interno/publico) | Toggle | Select visibility | Correct visibility tag |
| HQ-T43 | Empty comment validation | Form | Submit empty | Error or block |

**Worker Actions (HQ can also see)**:

| # | Test Case | Type | Action | Expected |
|---|-----------|------|--------|----------|
| HQ-T44 | "Cheguei" action button | Button | Click | Status updates |
| HQ-T45 | "Iniciar" action button | Button | Click | Status updates |
| HQ-T46 | "Aguardar Peças" action button | Button | Click | Status updates |

### 2.3 Condominiums (`/hq/condominios`)

**Component**: `CondominiumsPage.tsx` — 2075 lines

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-C1 | Condominium list loads | Data | Page load | Condominium cards/table visible |
| HQ-C2 | Condominium search works | Input | Search field | Filters by name/code |

**Detail Tabs (20+)**:

| # | Tab | Test Case | Expected |
|---|-----|-----------|----------|
| HQ-C3 | Overview | Condominium summary renders | Key info, KPIs, alerts |
| HQ-C4 | Identification | ID fields render and are editable | Name, code, NIF, etc. |
| HQ-C5 | Address | Address fields render | Street, city, postal code, locality |
| HQ-C6 | Structure | Building structure renders | Total units, floors, etc. |
| HQ-C7 | Blocks | Block list renders | Buildings/blocks listed |
| HQ-C8 | Floors | Floor list renders | Floor plan or list |
| HQ-C9 | Zones | Zone list renders | Common areas, garden, etc. |
| HQ-C10 | Equipment | Equipment list renders | Equipment with status |
| HQ-C11 | Fractions | Fraction list renders | Units with owners/tenants |
| HQ-C12 | Residents | Resident list renders | Residents with contact info |
| HQ-C13 | Contacts | Contact list renders | Emergency, management contacts |
| HQ-C14 | Media | Photo/video gallery renders | Upload and browse |
| HQ-C15 | Documents | Document list renders | Upload and browse documents |
| HQ-C16 | Alerts | Alert panel renders | Active alerts with manage |
| HQ-C17 | Imports | Import preview/commit works | Preview file, map fields, commit |
| HQ-C18 | Agreements | Payment agreements list | Agreements with status |
| HQ-C19 | KPI | Key metrics renders | Charts and numbers |
| HQ-C20 | Future | Future plans/notes renders | Planned improvements |
| HQ-C21 | History | Change history renders | Audit log of changes |

**Actions**:

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-C22 | Create condominium | Form | New condominium created |
| HQ-C23 | Archive condominium | Button | Condominium archived |
| HQ-C24 | Edit section info (SectionEditor) | Form | Section updates |
| HQ-C25 | Create subresource (building, fraction, etc.) | Form | Subresource created |
| HQ-C26 | Upload document | Upload | File attached to condominium |
| HQ-C27 | Upload media (photo/video) | Upload | Media attached |
| HQ-C28 | Download document | Button | File downloads |
| HQ-C29 | Download media | Button | Media downloads |
| HQ-C30 | Create plan marker | Form | Marker on plan/map |
| HQ-C31 | Import preview file | Upload | File preview shown |
| HQ-C32 | Import map fields | Form | Field mapping completed |
| HQ-C33 | Import commit | Button | Data imported |

### 2.4 Calendar (`/hq/calendario`)

**Component**: `CalendarPage.tsx` — 716 lines

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-CL1 | Month view renders | View | Default load | Month grid with events |
| HQ-CL2 | Week view renders | View | Click "week" | Week grid with events |
| HQ-CL3 | List view renders | View | Click "list" | Chronological list |
| HQ-CL4 | Navigate to next/previous period | Nav | Arrow buttons | Calendar shifts |
| HQ-CL5 | Filter by condominium | Dropdown | Select condominium | Events filtered |
| HQ-CL6 | Filter by event type | Dropdown | Select type | Events filtered |
| HQ-CL7 | Filter by event status | Dropdown | Select status | Events filtered |
| HQ-CL8 | Search events | Input | Type text | Events filtered |
| HQ-CL9 | Create event | Form | PlusIcon → fill → save | Event created |
| HQ-CL10 | Edit event | Form | EditIcon → modify → save | Event updated |
| HQ-CL11 | Delete event | Button | Trash2Icon → confirm | Event removed |
| HQ-CL12 | Quick inspection creation | Form | Click quick inspection | Inspection event created |
| HQ-CL13 | Click event shows detail | Interaction | Click event | Detail panel/modal |

### 2.5 Team (`/hq/equipa`)

**Component**: `TeamPage.tsx` — 188 lines

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-E1 | Team member list loads | Data | Page load | List of team members |
| HQ-E2 | Search team members | Input | Search field | Filters by name/email/role |
| HQ-E3 | Filter by status (todos/campo/validacao/livres) | Filter | Click filter | Filtered list |
| HQ-E4 | Click member shows detail | Selection | Click row | Detail panel opens |
| HQ-E5 | Member metrics display | Data | Inspect | Open tasks, in-progress, pending validation |
| HQ-E6 | Member list sorted by open tasks | Data | Inspect | Highest open tasks first |
| HQ-E7 | Empty state (no members) | State | (if applicable) | Empty message |

### 2.6 Tasks (`/hq/tarefas`)

**Component**: `TasksPage.tsx` — 297 lines

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-TK1 | Task list loads | Data | Page load | Operational task list |
| HQ-TK2 | Filter by kind (pedido/manutencao/vistoria/agenda) | Filter | Select kind | Filtered tasks |
| HQ-TK3 | Filter by time (todas/hoje/em-curso/validacao/atrasadas) | Filter | Select filter | Filtered tasks |
| HQ-TK4 | Search tasks | Input | Search | Filtered by text |
| HQ-TK5 | Task row shows kind icon | Visual | Inspect | Correct icon per kind |
| HQ-TK6 | Task row shows due date/status | Visual | Inspect | Date and status visible |
| HQ-TK7 | Click task navigates to detail | Nav | Click row | Navigates to entity detail |
| HQ-TK8 | Metric strip shows counts | Data | Inspect | Total, due today, overdue counts |
| HQ-TK9 | Empty state when no tasks | State | (if applicable) | Empty message |

### 2.7 Accounting (`/hq/contabilidade` — SPA fallback)

**Component**: `AccountingPage.tsx` — 437 lines

| # | Test Case | Type | Interaction | Expected |
|---|-----------|------|-------------|----------|
| HQ-A1 | Accounting overview loads | Data | Page load | Summary with charts/numbers |
| HQ-A2 | Switch context mode (general/condominium/resident/supplier/bank) | Tabs | Click mode tab | Context switches |
| HQ-A3 | Select condominium from dropdown | Dropdown | Select | Data scoped to condominium |
| HQ-A4 | Select resident from dropdown | Dropdown | Select | Data scoped to resident |

**Detail Tabs**:

| # | Test Case | Tab | Expected |
|---|-----------|-----|----------|
| HQ-A5 | Summary tab | Overview with totals |
| HQ-A6 | Quotas tab | Quota list with status |
| HQ-A7 | Debts tab | Debt list with amounts |
| HQ-A8 | Payments tab | Payment list with reconciliation |
| HQ-A9 | Expenses tab | Expense list |
| HQ-A10 | Bank tab | Bank transactions + reconciliation |
| HQ-A11 | Receipts tab | Receipt list |
| HQ-A12 | Agreements tab | Payment agreements |

**Actions**:

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-A13 | Create quota | Form | New quota generated |
| HQ-A14 | Create payment | Form | Payment recorded |
| HQ-A15 | Create expense | Form | Expense recorded |
| HQ-A16 | Create debt | Form | Debt recorded |
| HQ-A17 | Create receipt | Form | Receipt issued |
| HQ-A18 | Create payment agreement | Form | Agreement created |
| HQ-A19 | Search within accounting records | Input | Filtered results |
| HQ-A20 | Reconcile bank transaction | Action | Transaction reconciled |

### 2.8 Documents (`/hq/documentos` — SPA fallback)

**Component**: `DocumentsPage.tsx` / `PageOverview.tsx`

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-D1 | Document list loads | Data | Table/grid of documents |
| HQ-D2 | Search documents | Input | Filtered by title/content |
| HQ-D3 | Upload document | Upload | File uploaded |
| HQ-D4 | Download document | Button | File downloads |
| HQ-D5 | Preview document | Button | Preview panel opens |
| HQ-D6 | Generate document from template | Form | Document generated |
| HQ-D7 | Edit document metadata | Form | Metadata updated |
| HQ-D8 | Delete document | Button | Document removed |
| HQ-D9 | Filter by type/category | Select | Filtered list |
| HQ-D10 | Pagination through documents | Nav | More pages load |

### 2.9 Chat (`/hq/chat` — SPA fallback)

**Component**: `ChatPage.tsx` — 144 lines

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-CH1 | Chat message list loads | Data | Messages displayed |
| HQ-CH2 | Send text message | Form | Message sent, list refreshes |
| HQ-CH3 | Empty message validation | Form | Blocked / error |
| HQ-CH4 | Auto-refresh (polling) | State | New messages appear without manual reload |

### 2.10 Administration (`/hq/administracao` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-AD1 | Users list loads | Data | User table |
| HQ-AD2 | Create user | Form | New user created |
| HQ-AD3 | Edit user | Form | User updated |
| HQ-AD4 | Deactivate user | Button | User deactivated |
| HQ-AD5 | Roles/permissions list | Data | Role table |
| HQ-AD6 | Create role | Form | New role created |
| HQ-AD7 | Edit role permissions | Form | Permissions updated |

### 2.11 Assembleias (`/hq/assembleias` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-AS1 | Assembly list loads | Data | List of assemblies |
| HQ-AS2 | Create assembly | Form | New assembly scheduled |
| HQ-AS3 | Edit assembly | Form | Assembly updated |
| HQ-AS4 | Record minutes /决议 | Form | Minutes attached |

### 2.12 Suppliers (`/hq/fornecedores` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-F1 | Supplier list loads | Data | Supplier table |
| HQ-F2 | Create supplier | Form | New supplier |
| HQ-F3 | Edit supplier | Form | Supplier updated |
| HQ-F4 | View supplier contracts | Data | Contract list |

### 2.13 Reports (`/hq/relatorios` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-R1 | Report list loads | Data | Report list |
| HQ-R2 | Generate report | Form | Report generated |
| HQ-R3 | Preview report | Button | Preview renders |
| HQ-R4 | Export report (PDF/Excel) | Button | File downloads |

### 2.14 Maintenance (`/hq/manutencao` — SPA fallback)

**Component**: `MaintenancePage.tsx` — 369 lines

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-M1 | Maintenance list loads | Data | List with filters |
| HQ-M2 | Filter by type (Preventiva/Corretiva/etc.) | Filter | Filtered |
| HQ-M3 | Filter by status | Filter | Filtered |
| HQ-M4 | Filter by condominium | Filter | Filtered |
| HQ-M5 | Search maintenance | Input | Filtered by text |
| HQ-M6 | Create maintenance record | Form | Created |
| HQ-M7 | Edit maintenance record | Form | Updated |
| HQ-M8 | Delete maintenance record | Button | Removed |

### 2.15 Inspections (`/hq/vistorias` — SPA fallback)

**Component**: `InspectionsPage.tsx` — 632 lines

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-I1 | Inspection list loads | Data | List with filters |
| HQ-I2 | Filter by status | Filter | Filtered |
| HQ-I3 | Filter by result | Filter | Filtered |
| HQ-I4 | Search inspections | Input | Filtered |
| HQ-I5 | Create inspection | Form | Created |
| HQ-I6 | Edit inspection | Form | Updated |
| HQ-I7 | Submit inspection result | Form | Result recorded |
| HQ-I8 | Confirm inspection | Button | Status → Confirmada |
| HQ-I9 | Reject inspection | Button | Status → Rejeitada |
| HQ-I10 | Generate inspection document | Button | Document generated |
| HQ-I11 | Delete inspection | Button | Removed |

### 2.16 Residents (`/hq/moradores` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-RS1 | Resident list loads | Data | Resident table |
| HQ-RS2 | Search residents | Input | Filtered |
| HQ-RS3 | Filter by condominium | Filter | Filtered |
| HQ-RS4 | Create resident | Form | Created |
| HQ-RS5 | Edit resident | Form | Updated |
| HQ-RS6 | Deactivate resident | Button | Deactivated |

### 2.17 Settings (`/hq/definicoes` — SPA fallback)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| HQ-S1 | Settings page loads | Data | Settings form |
| HQ-S2 | Edit profile settings | Form | Saved |
| HQ-S3 | Edit company settings | Form | Saved |
| HQ-S4 | Change password | Form | Password changed |

---

## 3. Worker/Funcionário Context

### 3.1 Dashboard (`/worker/dashboard`)

**Status**: Migrated route, placeholder content

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-D1 | Dashboard loads with worker view | Data | Task summary, today's schedule |
| W-D2 | Quick action buttons for workers | Button | Report issue, view tasks |
| W-D3 | Worker-specific metrics visible | Data | Assigned tasks count, pending |

### 3.2 Tickets (`/worker/tickets`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-T1 | Worker ticket list loads (assigned only) | Data | Only worker's tickets shown |
| W-T2 | Filter tickets by status | Filter | Filtered |
| W-T3 | Update ticket status (worker actions) | Button | Cheguei, Iniciar, Aguardar Peças |
| W-T4 | Add comment to ticket | Form | Comment posted |
| W-T5 | View ticket detail | Nav | Detail panel opens |
| W-T6 | Mark ticket as resolved | Form | Resolution submitted |

### 3.3 Tasks (`/worker/tarefas`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-TK1 | Task list loads (personal + team) | Data | Task list |
| W-TK2 | Filter by status/time | Filter | Filtered |
| W-TK3 | Complete task | Action | Task marked done |

### 3.4 Calendar (`/worker/calendario`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-CL1 | Calendar loads (month/week/list) | View | Events visible |
| W-CL2 | Events show assigned work | Data | Work schedule events |
| W-CL3 | Quick inspection from calendar | Form | Inspection created |

### 3.5 Maintenance (`/worker/manutencao` — SPA)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-M1 | Maintenance list (assigned) | Data | Assigned tasks |
| W-M2 | Update maintenance status | Form | Status updated |
| W-M3 | Add notes/observations | Form | Notes saved |

### 3.6 Inspections (`/worker/vistorias` — SPA)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-I1 | Inspection list (assigned) | Data | Assigned inspections |
| W-I2 | Complete inspection checklist | Form | Checklist submitted |
| W-I3 | Submit inspection result | Form | Result recorded |

### 3.7 Chat (`/worker/chat` — SPA)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| W-CH1 | Chat loads (team/hq messages) | Data | Messages displayed |
| W-CH2 | Send message | Form | Message sent |

---

## 4. Client/Resident Context

### 4.1 Dashboard (`/client/dashboard`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-D1 | Dashboard loads with resident view | Data | Condominium summary, balance |
| C-D2 | Notices/announcements visible | Data | Recent notices |
| C-D3 | Quick actions (new ticket, pay quota) | Button | Action buttons visible |

### 4.2 Condominiums / My Unit (`/client/condominios`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-C1 | My unit details load | Data | Fraction info, area, rooms |
| C-C2 | Building/common area info | Data | Building details |

### 4.3 Tickets (`/client/tickets`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-T1 | My tickets list loads | Data | Only my tickets |
| C-T2 | Open new ticket | Form | Ticket created |
| C-T3 | View ticket status/history | Nav | Detail with timeline |
| C-T4 | Add comment to ticket | Form | Comment added |

### 4.4 Documents (`/client/documentos`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-DC1 | Shared documents list loads | Data | Condominium documents |
| C-DC2 | Download document | Button | File downloads |

### 4.5 Chat (`/client/chat`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-CH1 | Chat loads (condominium messages) | Data | Messages visible |
| C-CH2 | Send message to condominium admin | Form | Message sent |

### 4.6 Calendar (`/client/calendario`)

| # | Test Case | Type | Expected |
|---|-----------|------|----------|
| C-CL1 | Calendar loads (condominium events) | View | Events visible |
| C-CL2 | View event details | Nav | Event detail opens |

---

## 5. Auth & Session Flows

| # | Test Case | Type | Context | Expected |
|---|-----------|------|---------|----------|
| AU-1 | Auto-login (dev) — HQ | Flow | dev | browser-session → dashboard |
| AU-2 | Auto-login (dev) — Worker | Flow | dev | browser-session → dashboard |
| AU-3 | Auto-login (dev) — Client | Flow | dev | browser-session → dashboard |
| AU-4 | Production loginless smoke — HQ | Flow | prod | browser-session → dashboard when enabled |
| AU-5 | Production loginless smoke — Worker | Flow | prod | browser-session → dashboard when enabled |
| AU-6 | Production loginless smoke — Client | Flow | prod | browser-session → dashboard when enabled |
| AU-7 | Invalid credentials rejected | Flow | prod | Error message, stays on login |
| AU-8 | Session refresh (token) | Flow | all | Token refreshes without interruption |
| AU-9 | Session expiry redirects to login | Flow | all | Dashboard → login when expired |
| AU-10 | Logout clears session | Flow | all | Redirected to login |
| AU-11 | Post-logout, dashboard not accessible | Flow | all | Redirects to login |
| AU-12 | App context switch (HQ→Worker→Client) | Nav | all | Context menu → new app |
| AU-13 | Loginless dev guard (no manual credentials) | Contract | dev | `guard:loginless-dev` passes |
| AU-14 | CORS preflight succeeds (production) | Network | prod | OPTIONS request returns 200/204 |

---

## 6. Regression Test Matrix

This matrix defines **must-pass** test cases for each release cadence.

### Smoke (every deploy — ~5 min)

| Priority | Test Cases |
|----------|-----------|
| P0 | AU-1, AU-4, AU-7, AU-8, AU-10, AU-11 (auth smoke per context) |
| P0 | HQ-D1, HQ-T1, HQ-C1, HQ-CL1, HQ-E1 (each main page loads) |
| P0 | A1, A4 (shell renders, mobile responsive) |

### Sanity (daily — ~15 min)

All Smoke +:
| Priority | Test Cases |
|----------|-----------|
| P1 | HQ-T2 through HQ-T12 (ticket filters) |
| P1 | HQ-C3 through HQ-C21 (condominium tabs) |
| P1 | HQ-CL1 through HQ-CL13 (calendar views + CRUD) |
| P1 | C-T1, C-T2, C-D1 (client context) |
| P1 | W-T1, W-T3, W-D1 (worker context) |

### Full Regression (pre-release — ~1h)

All test cases in this document.

---

## Maintenance Protocol

### When a new feature is added:
1. Scrutator identifies the new page/component/feature
2. Adds new test cases to the appropriate section above
3. Updates the totals and version number
4. Marks as `[NEW]` for the first week

### When a feature changes:
1. Scrutator updates affected test cases
2. Adjusts selectors, expected behaviours, or removes obsolete cases
3. Bumps version number

### When a feature is removed:
1. Scrutator marks test cases as `[DEPRECATED]` for one cycle
2. Removes them in the next version

---

*This is a living document maintained by Scrutator. Last update: 2026-06-20*
