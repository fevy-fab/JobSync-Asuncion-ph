/**
 * SortDropdown Component
 *
 * Reusable dropdown for sorting lists with predefined or custom sort options
 */

'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  className?: string;
  label?: string;
}

// Default sort options for applications/trainings
export const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Newest First', icon: ArrowDown },
  { value: 'oldest', label: 'Oldest First', icon: ArrowUp },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
];

export function SortDropdown({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  className = '',
  label = 'Sort by',
}: SortDropdownProps) {
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const IconComponent = selectedOption.icon || ArrowUpDown;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="sort-dropdown" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        {label}:
      </label>
      <div className="relative">
        <select
          id="sort-dropdown"
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

        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <IconComponent className="w-4 h-4 text-gray-500" />
        </div>

        {/* Dropdown Arrow */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
