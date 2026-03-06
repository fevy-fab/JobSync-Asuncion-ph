import { SkeletonTile, SkeletonTable } from '@/components/ui/Skeleton';

export default function PESOLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Tiles skeleton - 6 tiles in 3-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
        {/* Recent applications table */}
        <SkeletonTable rows={5} cols={3} />
      </div>
    </div>
  );
}
