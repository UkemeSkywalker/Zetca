import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ProfileLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page title skeleton */}
      <LoadingSkeleton variant="text" width="250px" height="32px" />

      {/* Profile form skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <LoadingSkeleton variant="text" width="200px" height="24px" />
        
        {/* Avatar skeleton */}
        <div className="flex items-center gap-4">
          <LoadingSkeleton variant="circle" width="80px" height="80px" />
          <div className="space-y-2">
            <LoadingSkeleton variant="text" width="150px" />
            <LoadingSkeleton variant="rectangle" width="120px" height="32px" />
          </div>
        </div>

        {/* Form fields */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <LoadingSkeleton variant="text" width="120px" height="16px" />
            <LoadingSkeleton variant="rectangle" width="100%" height="40px" />
          </div>
        ))}

        {/* Save button */}
        <LoadingSkeleton variant="rectangle" width="150px" height="48px" />
      </div>

      {/* Connected accounts skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <LoadingSkeleton variant="text" width="250px" height="24px" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <LoadingSkeleton variant="circle" width="40px" height="40px" />
                <div className="space-y-2">
                  <LoadingSkeleton variant="text" width="100px" />
                  <LoadingSkeleton variant="text" width="80px" height="20px" />
                </div>
              </div>
              <LoadingSkeleton variant="rectangle" width="100px" height="36px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
