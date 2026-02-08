import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function CopywriterLoading() {
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
      <LoadingSkeleton variant="text" width="250px" height="32px" />

      {/* Caption editor skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <LoadingSkeleton variant="text" width="100px" height="20px" />
              <LoadingSkeleton variant="rectangle" width="120px" height="32px" />
            </div>
            <LoadingSkeleton variant="rectangle" width="100%" height="120px" />
            <div className="flex gap-2">
              <LoadingSkeleton variant="text" width="80px" height="24px" />
              <LoadingSkeleton variant="text" width="80px" height="24px" />
              <LoadingSkeleton variant="text" width="80px" height="24px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
