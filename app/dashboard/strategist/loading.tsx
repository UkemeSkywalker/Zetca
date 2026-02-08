import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function StrategistLoading() {
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
      <LoadingSkeleton variant="text" width="300px" height="32px" />

      {/* Strategy form skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <LoadingSkeleton variant="text" width="200px" height="24px" />
        
        {/* Form fields */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <LoadingSkeleton variant="text" width="120px" height="16px" />
            <LoadingSkeleton variant="rectangle" width="100%" height="40px" />
          </div>
        ))}

        {/* Generate button */}
        <LoadingSkeleton variant="rectangle" width="200px" height="48px" />
      </div>
    </div>
  );
}
