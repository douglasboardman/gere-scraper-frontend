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
