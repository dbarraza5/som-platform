import { Fragment } from 'react'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getDatasetPipelineSteps, type PipelineStepState } from '@/lib/datasetStatus'
import type { Dataset } from '@/types/dataset'

const STEP_ICON_CLASSNAME: Record<PipelineStepState, string> = {
  done: 'border-green-200 bg-green-100 text-green-700',
  current: 'border-amber-200 bg-amber-100 text-amber-700',
  pending: 'border-border bg-muted text-muted-foreground',
  error: 'border-red-200 bg-red-100 text-red-700',
}

const STEP_LABEL_CLASSNAME: Record<PipelineStepState, string> = {
  done: 'text-foreground',
  current: 'text-foreground font-semibold',
  pending: 'text-muted-foreground',
  error: 'text-destructive font-semibold',
}

function StepIcon({ state }: { state: PipelineStepState }) {
  if (state === 'done') return <CheckCircle2 className="h-5 w-5" />
  if (state === 'error') return <XCircle className="h-5 w-5" />
  if (state === 'current') return <Loader2 className="h-5 w-5 animate-spin" />
  return <Circle className="h-5 w-5" />
}

export default function DatasetPipeline({ dataset }: { dataset: Dataset }) {
  const steps = getDatasetPipelineSteps(dataset)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Flujo del Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start">
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                    STEP_ICON_CLASSNAME[step.state],
                  )}
                >
                  <StepIcon state={step.state} />
                </div>
                <p className={cn('text-xs sm:text-sm', STEP_LABEL_CLASSNAME[step.state])}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mt-5 h-0.5 flex-1',
                    step.state === 'done' ? 'bg-green-200' : 'bg-border',
                  )}
                />
              )}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
