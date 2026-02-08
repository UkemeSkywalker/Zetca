import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function SchedulerLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Agent workflow skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <LoadingSkeleton variant="circle" width="48px" height="48px" />
              <LoadingSkeleton variant="text" width="80px" height="16px" />
            </div>
          ))}
        </div>
      </div>

      {/* Page title skeleton */}
      <LoadingSkeleton variant="text" width="280px" height="32px" />

      {/* View toggle skeleton */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton variant="rectangle" width="200px" height="40px" />
        <LoadingSkeleton variant="rectangle" width="120px" height="40px" />
      </div>

      {/* Calendar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <LoadingSkeleton variant="circle" width="32px" height="32px" />
          <LoadingSkeleton variant="text" width="150px" height="24px" />
          <LoadingSkeleton variant="circle" width="32px" height="32px" />
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="rectangle" height="80px" />
          ))}
        </div>
      </div>
    </div>
  );
}
