import { SkeletonTile, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';

export default function ApplicantLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stat cards skeleton - 5 cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
        {/* Recent applications table */}
        <SkeletonTable rows={5} cols={4} />
        {/* Announcements skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
