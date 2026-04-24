# Edit Guard — Design Spec
**Data:** 2026-04-23
**Escopo:** Bloqueio de navegação durante modo de edição + condição de status para botão Editar

---

## Problema

Nas páginas de detalhamento (Contratação, Ata, Contrato, Item, Fornecimento, Fornecedor), o botão "Editar" abre um modo de edição inline. Atualmente:

1. O usuário pode navegar para outra rota (via link ou aba) sem aviso, perdendo as alterações silenciosamente.
2. A condição de habilitação do botão Editar é permissiva demais (vários status) quando a regra de negócio exige apenas status "Processado/Processada".

---

## Solução

### Peça 1 — `useEditGuard` hook

**Arquivo:** `src/hooks/useEditGuard.ts`

Encapsula dois mecanismos de bloqueio:

- **`useBlocker(editMode)`** (React Router v6.7+): intercepta qualquer navegação de rota — `<Link>`, `navigate()`, back/forward do browser — enquanto `editMode === true`. Quando disparado, define `blocker.state = 'blocked'`.
- **`pendingTabAction`** (estado local): quando o usuário clica em outra aba com `editMode === true`, a ação de trocar de aba é armazenada em vez de executada imediatamente.

**Interface pública:**

```ts
function useEditGuard(
  editMode: boolean,
  resetEditState: () => void   // sai do editMode e reseta campos do formulário
): {
  isDialogOpen: boolean         // true quando blocker ou tab pendente
  handleNavigate: () => void    // "Navegar": reseta + prossegue
  handleStay: () => void        // "Prosseguir com a Edição": cancela
  guardTabChange: (setTab: (t: string) => void) => (tab: string) => void
}
```

**`resetEditState`** é definida em cada página e deve:
1. Chamar `setEditMode(false)`
2. Chamar todos os setters de campo de edição de volta aos valores originais do registro

**`handleNavigate`:**
```
resetEditState()
blocker.proceed?.()       // se a origem foi navegação de rota
pendingTabAction?.()      // se a origem foi troca de aba
setPendingTabAction(null)
```

**`handleStay`:**
```
blocker.reset?.()         // cancela a navegação de rota bloqueada
setPendingTabAction(null) // descarta a troca de aba pendente
```

**`guardTabChange`:** retorna um handler para `onValueChange` das Tabs que intercepta quando `editMode === true`.

---

### Peça 2 — `UnsavedChangesDialog`

**Arquivo:** `src/components/shared/UnsavedChangesDialog.tsx`

Componente dedicado — não reutiliza `ConfirmDialog` porque a semântica dos botões é invertida (a ação primária é "ficar", não "confirmar a ação destrutiva").

**Props:**
```ts
interface UnsavedChangesDialogProps {
  open: boolean
  onNavigate: () => void   // "Navegar" — ação destrutiva
  onStay: () => void       // "Prosseguir com a Edição" — ação segura
}
```

**Visual:**
- Título: "Alterações não salvas"
- Descrição: "As alterações feitas serão perdidas se você navegar agora."
- Botão esquerdo (outline): "Prosseguir com a Edição" → `onStay`
- Botão direito (default/primário): "Navegar" → `onNavigate`
- `onOpenChange` desabilitado (não fecha ao clicar fora — evita acidente)

---

### Peça 3 — Condições de status do botão Editar

| Página | Condição nova |
|---|---|
| Contratação | `status === 'Processada'` (já estava correto) |
| Ata | `can('edit:atas') && ata.status === 'Processada'` |
| Contrato | `can('edit:contratos') && contrato.status === 'Processado'` |
| Item | `can('edit:itens') && item.status === 'Processado'` |
| Fornecimento | `can('edit:fornecimentos') && fornecimento.status === 'Processado'` |
| Fornecedor | `can('edit:fornecedores')` (sem restrição de status) |

---

### Peça 4 — Mudanças por página

Cada uma das 6 páginas recebe:

1. **Tabs controladas** (páginas com Tabs: Contratação, Ata, Contrato, Item):
   - Adicionar `const [activeTab, setActiveTab] = useState('informacoes')`
   - Converter `<Tabs>` para `value={activeTab}` + `onValueChange={guardTabChange(setActiveTab)}`

2. **`useEditGuard`** com `resetFn` local que reseta todos os estados de edição da página.

3. **`<UnsavedChangesDialog>`** no final do JSX de cada página.

4. **Condição de status** do botão Editar atualizada conforme tabela acima.

Páginas sem Tabs (Fornecimento, Fornecedor): apenas itens 2, 3 e 4.

---

## Arquivos criados/modificados

| Arquivo | Operação |
|---|---|
| `src/hooks/useEditGuard.ts` | criar |
| `src/components/shared/UnsavedChangesDialog.tsx` | criar |
| `src/pages/contratacoes/ContratacaoDetailPage.tsx` | modificar |
| `src/pages/atas/AtaDetailPage.tsx` | modificar |
| `src/pages/contratos/ContratoDetailPage.tsx` | modificar |
| `src/pages/itens/ItemDetailPage.tsx` | modificar |
| `src/pages/fornecimentos/FornecimentoDetailPage.tsx` | modificar |
| `src/pages/fornecedores/FornecedorDetailPage.tsx` | modificar |

---

## Fora de escopo

- Persistência de rascunho (localStorage, etc.)
- Aviso de saída do browser (beforeunload) — `useBlocker` já cobre navegação interna; aba fechada não é requisito
- Páginas de listagem
