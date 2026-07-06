import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DatasetDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Processing section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
