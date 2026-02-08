import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Welcome message skeleton */}
      <div className="space-y-3">
        <LoadingSkeleton variant="text" width="40%" height="32px" />
        <LoadingSkeleton variant="text" width="60%" height="20px" />
      </div>

      {/* Quick stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
            <LoadingSkeleton variant="circle" width="48px" height="48px" />
            <LoadingSkeleton variant="text" width="70%" />
            <LoadingSkeleton variant="text" width="50%" height="28px" />
          </div>
        ))}
      </div>

      {/* CTA button skeleton */}
      <div className="flex justify-center">
        <LoadingSkeleton variant="rectangle" width="200px" height="48px" />
      </div>
    </div>
  );
}
