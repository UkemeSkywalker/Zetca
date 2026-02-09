import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function PublisherLoading() {
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

      {/* Filter controls skeleton */}
      <div className="flex gap-4">
        <LoadingSkeleton variant="rectangle" width="150px" height="40px" />
        <LoadingSkeleton variant="rectangle" width="150px" height="40px" />
      </div>

      {/* Posts table skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-6 gap-4">
            {['Content', 'Platform', 'Date', 'Time', 'Status', 'Actions'].map((header) => (
              <LoadingSkeleton key={header} variant="text" width="80%" height="16px" />
            ))}
          </div>
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-gray-200 p-4">
            <div className="grid grid-cols-6 gap-4 items-center">
              <LoadingSkeleton variant="text" width="90%" />
              <LoadingSkeleton variant="text" width="70%" />
              <LoadingSkeleton variant="text" width="80%" />
              <LoadingSkeleton variant="text" width="60%" />
              <LoadingSkeleton variant="rectangle" width="80px" height="24px" />
              <LoadingSkeleton variant="rectangle" width="100px" height="32px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
