import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Dataset } from '@/types/dataset'

interface DeleteDatasetDialogProps {
  dataset: Dataset | null
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function DeleteDatasetDialog({
  dataset,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteDatasetDialogProps) {
  return (
    <Dialog open={!!dataset} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar dataset</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar{' '}
            <span className="font-semibold text-foreground">{dataset?.name}</span>? Esta acción no
            se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
