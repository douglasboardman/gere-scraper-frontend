# Edit Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear navegação (rota e abas) durante modo de edição em 6 páginas de detalhamento, exibindo um dialog de confirmação com opções "Navegar" ou "Prosseguir com a Edição".

**Architecture:** Um hook `useEditGuard` encapsula `useBlocker` (React Router) para navegação de rota e estado local `pendingTabAction` para troca de aba. Um componente `UnsavedChangesDialog` expõe o dialog. Cada página usa o hook + dialog e passa uma função `resetFn` que sai do editMode e reseta os campos.

**Tech Stack:** React 18, React Router DOM 6.28, TypeScript, shadcn/ui (Dialog, Button)

---

## File Map

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

## Task 1: Hook `useEditGuard`

**Files:**
- Create: `src/hooks/useEditGuard.ts`

- [ ] **Step 1: Criar o hook**

```ts
// src/hooks/useEditGuard.ts
import { useState } from 'react'
import { useBlocker } from 'react-router-dom'

export function useEditGuard(editMode: boolean, resetEditState: () => void) {
  const blocker = useBlocker(editMode)
  const [pendingTabAction, setPendingTabAction] = useState<(() => void) | null>(null)

  const isDialogOpen = blocker.state === 'blocked' || pendingTabAction !== null

  const handleNavigate = () => {
    resetEditState()
    if (blocker.state === 'blocked') blocker.proceed()
    if (pendingTabAction) {
      pendingTabAction()
      setPendingTabAction(null)
    }
  }

  const handleStay = () => {
    if (blocker.state === 'blocked') blocker.reset()
    setPendingTabAction(null)
  }

  const guardTabChange = (setTab: (t: string) => void) => (tab: string) => {
    if (editMode) {
      setPendingTabAction(() => () => setTab(tab))
    } else {
      setTab(tab)
    }
  }

  return { isDialogOpen, handleNavigate, handleStay, guardTabChange }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEditGuard.ts
git commit -m "feat: adiciona hook useEditGuard para bloqueio de navegação em modo de edição"
```

---

## Task 2: Componente `UnsavedChangesDialog`

**Files:**
- Create: `src/components/shared/UnsavedChangesDialog.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/shared/UnsavedChangesDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UnsavedChangesDialogProps {
  open: boolean
  onNavigate: () => void
  onStay: () => void
}

export function UnsavedChangesDialog({ open, onNavigate, onStay }: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Alterações não salvas</DialogTitle>
          <DialogDescription>
            As alterações feitas serão perdidas se você navegar agora.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStay}>
            Prosseguir com a Edição
          </Button>
          <Button onClick={onNavigate}>
            Navegar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/UnsavedChangesDialog.tsx
git commit -m "feat: adiciona componente UnsavedChangesDialog"
```

---

## Task 3: ContratacaoDetailPage

**Files:**
- Modify: `src/pages/contratacoes/ContratacaoDetailPage.tsx`

A condição de status já está correta (`status === 'Processada'`). Esta task adiciona: controlled tabs + useEditGuard + dialog.

- [ ] **Step 1: Adicionar import do hook e dialog**

Adicionar aos imports existentes:
```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Adicionar estado de aba e useEditGuard**

Dentro do componente, após os estados existentes de edição:
```tsx
const [activeTab, setActiveTab] = useState('informacoes')

const resetEditState = () => {
  setEditMode(false)
  setEditObjeto(contratacao?.objeto ?? '')
  setEditStatus(contratacao?.status ?? '')
}

const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
  editMode,
  resetEditState,
)
```

- [ ] **Step 3: Converter Tabs para controlado**

Localizar `<Tabs defaultValue="informacoes">` e substituir por:
```tsx
<Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
```

- [ ] **Step 4: Adicionar UnsavedChangesDialog no final do JSX**

Antes do `</div>` final do return:
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/contratacoes/ContratacaoDetailPage.tsx
git commit -m "feat: adiciona edit guard na ContratacaoDetailPage"
```

---

## Task 4: AtaDetailPage

**Files:**
- Modify: `src/pages/atas/AtaDetailPage.tsx`

- [ ] **Step 1: Adicionar imports**

```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Atualizar condição canEdit**

Localizar:
```tsx
const statusEditaveis = ["Processada", "Disponivel", "Encerrada"]
const canEdit = can("edit:atas") && statusEditaveis.includes(ata.status)
```

Substituir por:
```tsx
const canEdit = can("edit:atas") && ata.status === "Processada"
```

- [ ] **Step 3: Adicionar estado de aba e useEditGuard**

Após os estados de edição existentes:
```tsx
const [activeTab, setActiveTab] = useState('informacoes')

const resetEditState = () => {
  setEditMode(false)
  setEditStatus(ata?.status ?? '')
}

const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
  editMode,
  resetEditState,
)
```

- [ ] **Step 4: Converter Tabs para controlado**

Localizar `<Tabs defaultValue="informacoes">` e substituir por:
```tsx
<Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
```

- [ ] **Step 5: Adicionar UnsavedChangesDialog**

Antes do `</div>` final do return:
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/atas/AtaDetailPage.tsx
git commit -m "feat: adiciona edit guard na AtaDetailPage e restringe edição ao status Processada"
```

---

## Task 5: ContratoDetailPage

**Files:**
- Modify: `src/pages/contratos/ContratoDetailPage.tsx`

- [ ] **Step 1: Adicionar imports**

```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Atualizar condição canEdit**

Localizar:
```tsx
const canEdit = can('edit:contratos') && !['Em_Processamento', 'Inconsistente'].includes(contrato.status)
```

Substituir por:
```tsx
const canEdit = can('edit:contratos') && contrato.status === 'Processado'
```

- [ ] **Step 3: Adicionar estado de aba e useEditGuard**

Após os estados de edição existentes:
```tsx
const [activeTab, setActiveTab] = useState('informacoes')

const resetEditState = () => {
  setEditMode(false)
  setEditObjeto(contrato?.objeto ?? '')
  setEditIniVigencia(contrato?.iniVigencia ? contrato.iniVigencia.substring(0, 10) : '')
  setEditFimVigencia(contrato?.fimVigencia ? contrato.fimVigencia.substring(0, 10) : '')
  setEditValorGlobal(contrato?.valorGlobal?.toString() ?? '')
  setEditNumParcelas(contrato?.numParcelas?.toString() ?? '')
  setEditValorParcelas(contrato?.valorParcelas?.toString() ?? '')
  setEditStatus(contrato?.status ?? '')
}

const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
  editMode,
  resetEditState,
)
```

- [ ] **Step 4: Converter Tabs para controlado**

Localizar `<Tabs defaultValue="informacoes">` e substituir por:
```tsx
<Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
```

- [ ] **Step 5: Adicionar UnsavedChangesDialog**

Antes do `</div>` final do return:
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/contratos/ContratoDetailPage.tsx
git commit -m "feat: adiciona edit guard na ContratoDetailPage e restringe edição ao status Processado"
```

---

## Task 6: ItemDetailPage

**Files:**
- Modify: `src/pages/itens/ItemDetailPage.tsx`

- [ ] **Step 1: Adicionar imports**

```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Adicionar estado de aba e useEditGuard**

Após os estados de edição existentes:
```tsx
const [activeTab, setActiveTab] = useState('informacoes')

const resetEditState = () => {
  setEditMode(false)
  setEditDescBreve(item?.descBreve ?? item?.descricaoBreve ?? '')
  setEditDescDetalhada(item?.descDetalhada ?? item?.descricaoDetalhada ?? '')
  setEditStatus(item?.status ?? '')
}

const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
  editMode,
  resetEditState,
)
```

- [ ] **Step 3: Atualizar condição do botão Editar na seção border-t**

Localizar:
```tsx
{can('edit:itens') && ['Processado', 'Disponivel', 'Encerrado'].includes(item.status) && !editMode && (
```

Substituir por:
```tsx
{can('edit:itens') && item.status === 'Processado' && !editMode && (
```

- [ ] **Step 4: Converter Tabs para controlado**

Localizar `<Tabs defaultValue="informacoes">` e substituir por:
```tsx
<Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
```

- [ ] **Step 5: Adicionar UnsavedChangesDialog**

Antes do `</div>` final do return:
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/itens/ItemDetailPage.tsx
git commit -m "feat: adiciona edit guard na ItemDetailPage e restringe edição ao status Processado"
```

---

## Task 7: FornecimentoDetailPage

**Files:**
- Modify: `src/pages/fornecimentos/FornecimentoDetailPage.tsx`

Sem Tabs — apenas hook + dialog + condição de status.

- [ ] **Step 1: Adicionar imports**

```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Adicionar useEditGuard**

Após os estados de edição existentes:
```tsx
const resetEditState = () => {
  setEditMode(false)
  setEditValUnit(fornecimento?.valUnitHomologado?.toString() ?? '')
  setEditQtdAutorizada(fornecimento?.qtdAutorizada?.toString() ?? '')
  setEditQtdUtilizada(fornecimento?.qtdUtilizada?.toString() ?? '')
  setEditSaldo((fornecimento?.saldoDisponivel ?? fornecimento?.saldo)?.toString() ?? '')
  setEditStatus(fornecimento?.status ?? '')
}

const { isDialogOpen, handleNavigate, handleStay } = useEditGuard(editMode, resetEditState)
```

- [ ] **Step 3: Atualizar condição do botão Editar na seção border-t**

Localizar:
```tsx
{can('edit:fornecimentos') && ['Processado', 'Disponivel', 'Encerrado'].includes(fornecimento.status) && !editMode && (
```

Substituir por:
```tsx
{can('edit:fornecimentos') && fornecimento.status === 'Processado' && !editMode && (
```

- [ ] **Step 4: Adicionar UnsavedChangesDialog**

Antes do `</div>` final do return (após o `</Card>`):
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/fornecimentos/FornecimentoDetailPage.tsx
git commit -m "feat: adiciona edit guard na FornecimentoDetailPage e restringe edição ao status Processado"
```

---

## Task 8: FornecedorDetailPage

**Files:**
- Modify: `src/pages/fornecedores/FornecedorDetailPage.tsx`

Sem Tabs. Sem restrição de status (Fornecedor sempre editável com permissão).

- [ ] **Step 1: Adicionar imports**

```tsx
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
```

- [ ] **Step 2: Adicionar useEditGuard**

Após os estados de edição existentes (antes de `const { data: fornecedor, isLoading }`):
```tsx
const resetEditState = () => {
  setEditMode(false)
  setEditNome(fornecedor?.nome ?? '')
  setEditEmail(fornecedor?.email1 ?? fornecedor?.email ?? '')
  setEditEmail2(fornecedor?.email2 ?? '')
  setEditTelefone(fornecedor?.telefone1 ?? fornecedor?.telefone ?? '')
  setEditTelefone2(fornecedor?.telefone2 ?? '')
  setEditEndereco(fornecedor?.endereco ?? '')
}

const { isDialogOpen, handleNavigate, handleStay } = useEditGuard(editMode, resetEditState)
```

**Atenção:** `resetEditState` referencia `fornecedor` que é definido depois via `useQuery`. Isso é seguro em React porque a função só é chamada depois que o componente renderizou com dados — mas para evitar lint warning de closure, mover a definição de `resetEditState` para **depois** do `useQuery` e **antes** do early return `if (isLoading)`.

- [ ] **Step 3: Adicionar UnsavedChangesDialog**

Antes do `</div>` final do return (após o `<SancoesDialog>`):
```tsx
<UnsavedChangesDialog
  open={isDialogOpen}
  onNavigate={handleNavigate}
  onStay={handleStay}
/>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/fornecedores/FornecedorDetailPage.tsx
git commit -m "feat: adiciona edit guard na FornecedorDetailPage"
```

---

## Task 9: Verificação final

- [ ] **Step 1: TypeScript completo**

```bash
npx tsc --noEmit
```

Esperado: sem erros em nenhum arquivo.

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

Esperado: build sem erros ou warnings críticos.
