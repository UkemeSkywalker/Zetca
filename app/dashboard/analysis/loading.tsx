import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AnalysisLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page title skeleton */}
      <LoadingSkeleton variant="text" width="300px" height="32px" />

      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <LoadingSkeleton variant="circle" width="40px" height="40px" />
              <LoadingSkeleton variant="text" width="60px" height="20px" />
            </div>
            <LoadingSkeleton variant="text" width="70%" height="16px" />
            <LoadingSkeleton variant="text" width="50%" height="28px" />
          </div>
        ))}
      </div>

      {/* Engagement chart skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <LoadingSkeleton variant="text" width="200px" height="24px" />
        <LoadingSkeleton variant="rectangle" width="100%" height="300px" />
      </div>

      {/* Platform performance and top posts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform performance skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <LoadingSkeleton variant="text" width="200px" height="24px" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <LoadingSkeleton variant="circle" width="40px" height="40px" />
                <LoadingSkeleton variant="text" width="100px" />
              </div>
              <LoadingSkeleton variant="text" width="60px" />
            </div>
          ))}
        </div>

        {/* Top posts skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <LoadingSkeleton variant="text" width="200px" height="24px" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border border-gray-100 rounded-lg space-y-2">
              <LoadingSkeleton variant="text" width="100%" />
              <LoadingSkeleton variant="text" width="80%" />
              <div className="flex gap-4">
                <LoadingSkeleton variant="text" width="80px" />
                <LoadingSkeleton variant="text" width="80px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
