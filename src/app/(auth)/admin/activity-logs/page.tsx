'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Avatar,
  Card,
  EnhancedTable,
  Container,
  RefreshButton,
  EventBadge,
  EventIcon,
  StatusIndicator,
  ImagePreviewModal,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/auth';
import {
  ACTIVITY_EVENT_CONFIG,
  getEventConfig,
  type EventCategory,
} from '@/lib/activityEventConfig';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Filter,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { SkeletonTable, SkeletonTile } from '@/components/ui/Skeleton';

interface ActivityLog {
  id: string;
  event_type: string;
  event_category: EventCategory;
  user_email: string | null;
  user_role: string | null;
  details: string;
  status: 'success' | 'failed';
  metadata: any;
  timestamp: string;
  profiles?: {
    full_name?: string;
    profile_image_url?: string | null;
  };
}

const PAGE_SIZE = 50;

const CRITICAL_AUTH_EVENT_TYPES = Object.entries(ACTIVITY_EVENT_CONFIG)
  .filter(([, config]) => {
    return (
      config.category === 'auth' &&
      (config.severity === 'critical' || config.severity === 'high')
    );
  })
  .map(([eventType]) => eventType);

export default function ActivityLogsPage() {
  const { showToast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Activity Logs is focused on AUTH only.
  // CRUD/system accountability should be viewed in Audit Trail.
  const [activeStatus, setActiveStatus] = useState<'all' | 'success' | 'failed'>('all');

  // Server-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Server-side stats states
  const [totalAuthCount, setTotalAuthCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Image Preview Modal
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewUserName, setPreviewUserName] = useState<string>('');

  const sanitizeSearchTerm = (value: string) => {
    return value.trim().replace(/[%_,]/g, '');
  };

  const applySearchToQuery = (query: any) => {
    const safeSearchTerm = sanitizeSearchTerm(debouncedSearchTerm);

    if (safeSearchTerm) {
      return query.or(
        `event_type.ilike.%${safeSearchTerm}%,user_email.ilike.%${safeSearchTerm}%,user_role.ilike.%${safeSearchTerm}%,details.ilike.%${safeSearchTerm}%`
      );
    }

    return query;
  };

  const fetchActivityStats = useCallback(async () => {
    const createCountQuery = (status?: 'success' | 'failed') => {
      let query = supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('event_category', 'auth');

      query = applySearchToQuery(query);

      if (status) {
        query = query.eq('status', status);
      }

      return query;
    };

    let criticalQuery = supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('event_category', 'auth');

    criticalQuery = applySearchToQuery(criticalQuery);

    if (CRITICAL_AUTH_EVENT_TYPES.length > 0) {
      criticalQuery = criticalQuery.in('event_type', CRITICAL_AUTH_EVENT_TYPES);
    } else {
      setCriticalCount(0);
    }

    const [totalResult, successResult, failedResult, criticalResult] = await Promise.all([
      createCountQuery(),
      createCountQuery('success'),
      createCountQuery('failed'),
      CRITICAL_AUTH_EVENT_TYPES.length > 0 ? criticalQuery : Promise.resolve({ count: 0, error: null }),
    ]);

    if (totalResult.error) throw totalResult.error;
    if (successResult.error) throw successResult.error;
    if (failedResult.error) throw failedResult.error;
    if (criticalResult.error) throw criticalResult.error;

    setTotalAuthCount(totalResult.count || 0);
    setSuccessCount(successResult.count || 0);
    setFailedCount(failedResult.count || 0);
    setCriticalCount(criticalResult.count || 0);
  }, [debouncedSearchTerm]);

  const fetchActivityLogs = useCallback(
    async (showSuccessMessage = false) => {
      try {
        setIsLoading(true);

        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('activity_logs')
          .select(
            `
            id,
            event_type,
            event_category,
            user_email,
            user_role,
            details,
            status,
            metadata,
            timestamp,
            profiles:user_id (
              full_name,
              profile_image_url
            )
          `,
            { count: 'exact' }
          )
          .eq('event_category', 'auth')
          .order('timestamp', { ascending: false });

        query = applySearchToQuery(query);

        if (activeStatus !== 'all') {
          query = query.eq('status', activeStatus);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
          console.error('Error fetching auth activity logs:', error);
          throw error;
        }

        setActivities((data || []) as ActivityLog[]);
        setTotalCount(count || 0);

        await fetchActivityStats();

        if (showSuccessMessage) {
          showToast('Auth activity logs refreshed', 'success');
        }
      } catch (error: any) {
        console.error('Failed to fetch auth activity logs:', error);
        showToast(getErrorMessage(error), 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      activeStatus,
      debouncedSearchTerm,
      fetchActivityStats,
      showToast,
    ]
  );

  const handleAvatarClick = (imageUrl: string | null | undefined, userName: string) => {
    if (imageUrl) {
      setPreviewImageUrl(imageUrl);
      setPreviewUserName(userName);
      setShowImagePreview(true);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchActivityLogs();
    }
  }, [authLoading, isAuthenticated, fetchActivityLogs]);

  const handleStatusFilterChange = (status: 'all' | 'success' | 'failed') => {
    setActiveStatus(status);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setActiveStatus('all');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
  };

  const columns = [
    {
      header: 'Event',
      accessor: 'event_type' as const,
      sortable: true,
      render: (value: string) => {
        const config = getEventConfig(value);

        return (
          <div className="flex items-center gap-3">
            <EventIcon eventType={value} size="sm" />
            <div>
              <EventBadge eventType={value} size="sm" />
              <StatusIndicator
                severity={config.severity}
                size="sm"
                className="mt-1"
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'User',
      accessor: 'user_email' as const,
      sortable: true,
      render: (value: string, row: ActivityLog) => (
        <div className="flex items-center gap-3">
          <Avatar
            imageUrl={row.profiles?.profile_image_url}
            userName={row.profiles?.full_name || value || 'System'}
            size="sm"
            onClick={() =>
              handleAvatarClick(
                row.profiles?.profile_image_url,
                row.profiles?.full_name || value || 'System'
              )
            }
            clickable
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {value || 'System'}
            </p>
            {row.user_role && (
              <p className="text-xs text-gray-500">{row.user_role}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Details',
      accessor: 'details' as const,
      render: (value: string) => (
        <span className="text-sm text-gray-600 line-clamp-2">{value}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status' as const,
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {value === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Success
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Failed
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      header: 'Timestamp',
      accessor: 'timestamp' as const,
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);

        return (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {date.toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                {date.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );
      },
    },
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalCount);

  const hasActiveFilters =
    activeStatus !== 'all' || sanitizeSearchTerm(searchTerm).length > 0;

  return (
    <AdminLayout
      role="Admin"
      userName={user?.fullName || 'System Admin'}
      pageTitle="Activity Logs"
      pageDescription="Monitor authentication events and account access activity"
    >
      <Container size="xl">
        <div className="space-y-6">
          {/* Header with Search and Refresh */}
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Authentication Activity Logs
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {showingFrom} to {showingTo} of {totalCount} auth event(s)
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search auth logs..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555] min-w-[260px]"
                />
              </div>

              <RefreshButton
                onRefresh={() => fetchActivityLogs(true)}
                label="Refresh"
                showLastRefresh={true}
              />
            </div>
          </div>

          {/* Summary Stats */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card
                variant="flat"
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Auth Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {totalAuthCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card
                variant="flat"
                className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Successful</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {successCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card
                variant="flat"
                className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Failed Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {failedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card
                variant="flat"
                className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Critical Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {criticalCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card variant="flat" className="bg-white">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Event Category - Auth Only */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Event Category
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 bg-blue-500 text-white border-blue-500 cursor-default"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Auth ({totalAuthCount})
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Activity Logs are focused on authentication and account access events.
                CRUD-related system changes are monitored in the Audit Trail.
              </p>
            </div>

            {/* Status Filter */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Status</p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusFilterChange('all')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    activeStatus === 'all'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All ({totalAuthCount})
                </button>

                <button
                  onClick={() => handleStatusFilterChange('success')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    activeStatus === 'success'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Success ({successCount})
                </button>

                <button
                  onClick={() => handleStatusFilterChange('failed')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    activeStatus === 'failed'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Failed ({failedCount})
                </button>
              </div>
            </div>
          </Card>

          {/* Activity Logs Table */}
          <Card title="AUTH ACTIVITY HISTORY" headerColor="bg-[#D4F4DD]">
            {isLoading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No authentication activity logs found
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm text-gray-700">
                  <p>
                    Showing{' '}
                    <span className="font-semibold">{showingFrom}</span>
                    {' '}to{' '}
                    <span className="font-semibold">{showingTo}</span>
                    {' '}of{' '}
                    <span className="font-semibold">{totalCount}</span>
                    {' '}auth event(s)
                  </p>

                  <p>
                    Page {currentPage} of {totalPages}
                  </p>
                </div>

                <EnhancedTable
                  columns={columns}
                  data={activities}
                  searchable={false}
                  paginated={false}
                  pageSize={PAGE_SIZE}
                  getRowColor={(row: ActivityLog) => {
                    const config = getEventConfig(row.event_type);
                    return config.rowColor || '';
                  }}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages || isLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Info Card */}
          <Card
            variant="flat"
            className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  About Activity Logs
                </p>
                <p className="text-sm text-gray-600">
                  This page displays authentication-related activities only, such
                  as login, logout, account access, and failed authentication
                  attempts. Database create, update, and delete activities for
                  users, jobs, applications, training, and other system records
                  are monitored separately in the Audit Trail.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Container>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={previewImageUrl}
        imageName={`${previewUserName}'s Profile Picture`}
        userName={previewUserName}
      />
    </AdminLayout>
  );
}