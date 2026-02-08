import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function DesignerLoading() {
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

      {/* Image generation form skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <LoadingSkeleton variant="text" width="200px" height="24px" />
        <div className="flex gap-4">
          <LoadingSkeleton variant="rectangle" className="flex-1" height="40px" />
          <LoadingSkeleton variant="rectangle" width="180px" height="40px" />
        </div>
      </div>

      {/* Generated images grid skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <LoadingSkeleton variant="text" width="200px" height="24px" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <LoadingSkeleton variant="image" />
              <LoadingSkeleton variant="text" width="100%" />
              <LoadingSkeleton variant="text" width="60%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
