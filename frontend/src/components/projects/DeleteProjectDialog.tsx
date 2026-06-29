import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types/project'

interface DeleteProjectDialogProps {
  project: Project | null
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function DeleteProjectDialog({
  project,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={!!project} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar proyecto</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar{' '}
            <span className="font-semibold text-foreground">{project?.name}</span>? Esta acción no
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
