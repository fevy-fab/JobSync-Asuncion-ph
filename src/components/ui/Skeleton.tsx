'use client';
import React from 'react';

/**
 * Reusable skeleton loading primitives
 * Uses animate-pulse for consistent loading states
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded h-4 ${className}`} />;
}

export function SkeletonTile({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
          <div className="animate-pulse bg-gray-200 rounded h-8 w-16" />
        </div>
        <div className="animate-pulse bg-gray-200 rounded-xl w-12 h-12" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#D4F4DD] px-6 py-3">
        <div className="animate-pulse bg-green-200 rounded h-5 w-48" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="animate-pulse bg-gray-200 rounded h-4 flex-1"
                style={{ maxWidth: j === 0 ? '200px' : '120px' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-[#D4F4DD] px-6 py-3">
        <div className="animate-pulse bg-green-200 rounded h-5 w-40" />
      </div>
      <div className="p-6">
        <div className="h-64 flex items-end gap-2 px-4">
          {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 rounded-t flex-1"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 space-y-3 ${className}`}>
      <div className="animate-pulse bg-gray-200 rounded h-5 w-3/4" />
      <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
      <div className="animate-pulse bg-gray-200 rounded h-4 w-2/3" />
    </div>
  );
}

/**
 * Skeleton for stat cards used in applicant dashboard
 */
export function SkeletonStatCards({ count = 5 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(count, 5)} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  );
}
