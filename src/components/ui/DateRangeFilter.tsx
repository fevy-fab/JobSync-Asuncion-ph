/**
 * DateRangeFilter Component
 *
 * Reusable date range filter dropdown with predefined time ranges
 */

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

export interface DateRangeOption {
  value: string;
  label: string;
  getDays: () => number | null; // null means all time
}

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: DateRangeOption[];
  className?: string;
  label?: string;
}

// Default date range options
export const DEFAULT_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'all', label: 'All Time', getDays: () => null },
  { value: 'today', label: 'Today', getDays: () => 0 },
  { value: '7days', label: 'Last 7 Days', getDays: () => 7 },
  { value: '30days', label: 'Last 30 Days', getDays: () => 30 },
  { value: '90days', label: 'Last 90 Days', getDays: () => 90 },
];

/**
 * Helper function to check if a date is within the selected range
 * @param dateString - ISO date string to check
 * @param rangeValue - Selected range value
 * @param options - Date range options
 * @returns true if date is within range
 */
export function isDateInRange(
  dateString: string | null | undefined,
  rangeValue: string,
  options: DateRangeOption[] = DEFAULT_DATE_RANGE_OPTIONS
): boolean {
  if (!dateString) return false;

  const option = options.find(opt => opt.value === rangeValue);
  if (!option) return true;

  const days = option.getDays();
  if (days === null) return true; // All time

  const date = new Date(dateString);
  const now = new Date();

  if (days === 0) {
    // Today - check if same day
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  // Calculate date difference
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= days;
}

export function DateRangeFilter({
  value,
  onChange,
  options = DEFAULT_DATE_RANGE_OPTIONS,
  className = '',
  label = 'Date range',
}: DateRangeFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="date-range-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        {label}:
      </label>
      <div className="relative">
        <select
          id="date-range-filter"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-10 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22A555] focus:border-transparent transition-all cursor-pointer"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Calendar Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Calendar className="w-4 h-4 text-gray-500" />
        </div>

        {/* Dropdown Arrow */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
