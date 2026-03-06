'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { Avatar, Card, EnhancedTable, Button, Container, Badge, RefreshButton, StatusFilter, QuickFilters, ImagePreviewModal } from '@/components/ui';
import { DateRangeFilter, DEFAULT_DATE_RANGE_OPTIONS, isDateInRange } from '@/components/ui/DateRangeFilter';
import { SortDropdown } from '@/components/ui/SortDropdown';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { PDSViewModal } from '@/components/ui/PDSViewModal';
import { ApplicationDrawer } from '@/components/hr/ApplicationDrawer';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Calendar, User, Briefcase, CheckCircle, XCircle, TrendingUp, CheckCircle2, History, X, Clock } from 'lucide-react';
import { SkeletonTable, SkeletonTile } from '@/components/ui/Skeleton';
import { StatusTimeline } from '@/components/hr/StatusTimeline';

interface StatusHistoryItem {
  from: string | null;
  to: string;
  changed_at: string;
  changed_by?: string;
}

interface Application {
  id: string;
  no: number;
  applicantName: string;
  email: string;
  jobTitle: string;
  uploadedDate: string;
  status: string;
  pdsUrl: string;
  ocrProcessed: boolean;
  aiProcessed: boolean;
  signatureUrl: string | null;
  signatureUploadedAt: string | null;
  statusHistory?: StatusHistoryItem[];
  _raw: any;
}

export default function ScannedRecordsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({ needsAction: 0, inProgress: 0, approved: 0, denied: 0 });
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hr-scanned-records-date') || 'all';
    }
    return 'all';
  });
  const [sortOrder, setSortOrder] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hr-scanned-records-sort') || 'newest';
    }
    return 'newest';
  });
  const [showApplicationDrawer, setShowApplicationDrawer] = useState(false);
  const [selectedApplicationForDrawer, setSelectedApplicationForDrawer] = useState<Application | null>(null);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('hr-scanned-records-date', dateRangeFilter);
  }, [dateRangeFilter]);

  useEffect(() => {
    localStorage.setItem('hr-scanned-records-sort', sortOrder);
  }, [sortOrder]);
  const [pdsDataModal, setPdsDataModal] = useState<{
    isOpen: boolean;
    data: any;
    applicantName: string;
  } | null>(null);
  const [showStatusHistoryModal, setShowStatusHistoryModal] = useState(false);
  const [selectedApplicationForHistory, setSelectedApplicationForHistory] = useState<Application | null>(null);

  // Image Preview Modal
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewUserName, setPreviewUserName] = useState<string>('');

  // Fetch applications with server-side pagination and filtering
  const fetchScannedRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('fields', 'list');
      params.set('limit', String(pageSize));
      params.set('page', String(page));
      if (selectedJob !== 'all') params.set('job_id', selectedJob);

      // Map quickFilter to server-side status params
      if (quickFilter === 'needsAction') {
        params.set('status', 'pending');
      } else if (quickFilter === 'inProgress') {
        params.set('statuses', 'under_review,shortlisted,interviewed');
      } else if (quickFilter === 'approved') {
        params.set('statuses', 'approved,hired');
      } else if (quickFilter === 'denied') {
        params.set('status', 'denied');
      }

      const response = await fetch(`/api/applications?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setApplications(
          result.data.map((app: any, index: number) => ({
            id: app.id,
            no: (page - 1) * pageSize + index + 1,
            applicantName: `${app.applicant_profiles?.first_name || ''} ${app.applicant_profiles?.surname || ''}`.trim() || 'Unknown',
            email: app.applicant_profiles?.profiles?.email || user?.email || 'N/A',
            jobTitle: app.jobs?.title || 'Unknown Position',
            matchScore: app.match_score,
            rank: app.rank,
            appliedDate: new Date(app.created_at).toLocaleDateString(),
            uploadedDate: new Date(app.created_at).toLocaleDateString(),
            status: app.status,
            ocrProcessed: app.applicant_profiles?.ocr_processed || false,
            aiProcessed: app.applicant_profiles?.ai_processed || false,
            signatureUrl: app.applicant_pds?.signature_url || null,
            signatureUploadedAt: app.applicant_pds?.signature_uploaded_at || null,
            statusHistory: app.status_history || [],
            _raw: app,
          }))
        );

        // Update pagination metadata
        if (result.pagination) {
          setTotalCount(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        } else {
          setTotalCount(result.count || 0);
          setTotalPages(1);
        }

        // Extra safeguard: if we got data but totalCount is still 0, use data length
        const resolvedTotal = result.pagination?.total ?? result.count ?? 0;
        if (result.data?.length > 0 && resolvedTotal === 0) {
          setTotalCount(result.data.length);
        }

        // Update server-side status counts
        if (result.statusCounts) {
          setStatusCounts(result.statusCounts);
        }
      } else {
        showToast(getErrorMessage(result.error), 'error');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      showToast('Failed to fetch applications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user, page, pageSize, selectedJob, quickFilter]);

  useEffect(() => {
    fetchScannedRecords();
  }, [fetchScannedRecords]);

  // Fetch jobs list separately for the dropdown
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        const result = await response.json();
        if (result.success && result.data) {
          setJobs(result.data.map((job: any) => ({ id: job.id, title: job.title })));
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };
    fetchJobs();
  }, []);

  // Handle avatar click to show image preview
  const handleAvatarClick = (imageUrl: string | null, userName: string) => {
    if (imageUrl) {
      setPreviewImageUrl(imageUrl);
      setPreviewUserName(userName);
      setShowImagePreview(true);
    }
  };

  // View PDS
  const handleViewPDS = async (application: Application) => {
    try {
      const pdsId = application._raw?.pds_id;
      const applicantName = application.applicantName;

      // Check for web-based PDS (pds_id)
      if (pdsId) {
        const response = await fetch(`/api/pds/${pdsId}`);
        const result = await response.json();

        if (result.success) {
          setPdsDataModal({
            isOpen: true,
            data: result.data,
            applicantName,
          });
          return;
        } else {
          showToast(getErrorMessage(result.error), 'error');
          return;
        }
      }

      // No PDS available
      showToast('No PDS data available for this applicant', 'warning');
    } catch (error) {
      console.error('Error viewing PDS:', error);
      showToast('Failed to view PDS', 'error');
    }
  };

  const columns = [
    {
      header: 'No.',
      accessor: 'no' as const,
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      header: 'Applicant Name',
      accessor: 'applicantName' as const,
      render: (value: string, row: Application) => (
        <div className="flex items-center gap-3">
          <Avatar
            imageUrl={row.applicant_profiles?.profiles?.profile_image_url}
            userName={value}
            size="sm"
            onClick={() => handleAvatarClick(row.applicant_profiles?.profiles?.profile_image_url, value)}
            clickable
          />
          <button
            onClick={() => {
              setSelectedApplicationForDrawer(row);
              setShowApplicationDrawer(true);
            }}
            className="flex-1 text-left hover:opacity-75 transition-opacity"
            title="Click to view application details"
          >
            <span className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{value}</span>
          </button>
        </div>
      )
    },
    {
      header: 'Position Applied',
      accessor: 'jobTitle' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{value}</span>
        </div>
      )
    },
    {
      header: 'Upload Date',
      accessor: 'uploadedDate' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{value}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status' as const,
      render: (value: string, row: Application) => (
        <ApplicationStatusBadge
          status={value as any}
          createdAt={row.uploadedDate}
          showDate={false}
        />
      ),
    },
    {
      header: 'Status History',
      accessor: 'id' as const,
      render: (_: any, row: Application) => {
        const hasHistory = row.statusHistory && row.statusHistory.length > 0;
        return (
          <Button
            variant={hasHistory ? "primary" : "secondary"}
            size="sm"
            icon={History}
            onClick={() => {
              setSelectedApplicationForHistory(row);
              setShowStatusHistoryModal(true);
            }}
            className="text-xs whitespace-nowrap"
          >
            {hasHistory ? `View History (${row.statusHistory?.length || 0})` : 'View Status'}
          </Button>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions' as const,
      render: (_: any, row: Application) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={FileText}
            onClick={() => handleViewPDS(row)}
            title="View PDS"
          >
            View PDS
          </Button>
        </div>
      )
    },
  ];

  // Filter applications client-side for date range and status dropdown only
  // (job filter and quick filter are now handled server-side)
  const filteredApplications = applications.filter((app) => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    // Date range filter
    const matchesDateRange = isDateInRange(
      app._raw.created_at,
      dateRangeFilter,
      DEFAULT_DATE_RANGE_OPTIONS
    );

    return matchesStatus && matchesDateRange;
  });

  // Sort applications based on selected sort order
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortOrder) {
      case 'newest':
        // Most recent applications first
        return new Date(b._raw.created_at).getTime() - new Date(a._raw.created_at).getTime();

      case 'oldest':
        // Oldest applications first
        return new Date(a._raw.created_at).getTime() - new Date(b._raw.created_at).getTime();

      case 'updated':
        // Recently updated first
        return new Date(b._raw.updated_at).getTime() - new Date(a._raw.updated_at).getTime();

      default:
        // Default to newest
        return new Date(b._raw.created_at).getTime() - new Date(a._raw.created_at).getTime();
    }
  });

  // Quick filter counts (server-side, accurate across all pages)
  const quickFilterCounts = statusCounts;

  // Calculate stats - Time-based and completion metrics (non-redundant with Quick Filters)
  const totalPDS = totalCount;

  const today = new Date().toDateString();
  const uploadedToday = applications.filter((a) => {
    const uploadDate = new Date(a._raw.created_at).toDateString();
    return uploadDate === today;
  }).length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const uploadedThisWeek = applications.filter((a) => {
    const uploadDate = new Date(a._raw.created_at);
    return uploadDate >= oneWeekAgo;
  }).length;

  const withSignatures = applications.filter((a) => a.signatureUrl).length;

  return (
    <AdminLayout role="HR" userName={user?.fullName || "HR Admin"} pageTitle="Scanned PDS Records" pageDescription="Manage uploaded Personal Data Sheets">
      <Container size="xl">
        <div className="space-y-6">
          {/* Header with Filters */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <select
                value={selectedJob}
                onChange={(e) => { setSelectedJob(e.target.value); setPage(1); }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]"
              >
                <option value="all">All Positions</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>

              <SortDropdown
                value={sortOrder}
                onChange={setSortOrder}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'updated', label: 'Recently Updated' },
                ]}
              />

              <DateRangeFilter
                value={dateRangeFilter}
                onChange={setDateRangeFilter}
                options={DEFAULT_DATE_RANGE_OPTIONS}
                label="Date applied"
              />
            </div>

            <RefreshButton
              onRefresh={fetchScannedRecords}
              label="Refresh Applications"
              showLastRefresh={true}
            />
          </div>

          {/* Summary Stats - Time-based & Completion Metrics (Non-Redundant with Quick Filters) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total PDS Uploaded</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPDS}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Uploaded Today</p>
                  <p className="text-3xl font-bold text-gray-900">{uploadedToday}</p>
                  <p className="text-xs text-gray-500 mt-1">Today's activity</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Uploaded This Week</p>
                  <p className="text-3xl font-bold text-gray-900">{uploadedThisWeek}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">With Signatures</p>
                  <p className="text-3xl font-bold text-gray-900">{withSignatures}</p>
                  <p className="text-xs text-gray-500 mt-1">Completion rate: {totalPDS > 0 ? ((withSignatures / totalPDS) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="w-12 h-12 bg-[#22A555] rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>
          )}

          {/* Quick Filters */}
          <div className="flex items-center justify-between">
            <QuickFilters
              activeFilter={quickFilter}
              onChange={(val: string) => { setQuickFilter(val); setPage(1); }}
              counts={quickFilterCounts}
            />
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{totalCount > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)}` : '0'}</span> of {totalCount} applications
            </div>
          </div>

          {/* PDS Records Table */}
          <Card title="LIST OF PDS UPLOADED BY APPLICANTS" headerColor="bg-[#D4F4DD]">
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {applications.length === 0 ? 'No PDS files uploaded yet' : 'No applications match the selected filters'}
              </div>
            ) : (
              <EnhancedTable
                columns={columns}
                data={sortedApplications}
                searchable
                paginated={false}
                searchPlaceholder="Search by applicant name, position, or file name..."
              />
            )}
          </Card>

          {/* Server-side Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalCount} total applications)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* PDS Data Modal (for web-based PDS) */}
      <PDSViewModal
        isOpen={pdsDataModal?.isOpen || false}
        onClose={() => setPdsDataModal(null)}
        pdsData={pdsDataModal?.data}
        applicantName={pdsDataModal?.applicantName || ''}
      />

      {/* Application Details Drawer */}
      <ApplicationDrawer
        isOpen={showApplicationDrawer}
        onClose={() => {
          setShowApplicationDrawer(false);
          setSelectedApplicationForDrawer(null);
        }}
        application={selectedApplicationForDrawer as any}
      />

      {/* Status History Modal */}
      {showStatusHistoryModal && selectedApplicationForHistory && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between z-10 shadow-lg rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <History className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Application Status History</h3>
                  <p className="text-sm text-blue-100">Track application progress</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStatusHistoryModal(false);
                  setSelectedApplicationForHistory(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Application Info */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedApplicationForHistory.applicantName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedApplicationForHistory.jobTitle}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Applied on: {selectedApplicationForHistory.uploadedDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {selectedApplicationForHistory.statusHistory && selectedApplicationForHistory.statusHistory.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 overflow-visible">
                  <StatusTimeline
                    statusHistory={selectedApplicationForHistory.statusHistory}
                    currentStatus={selectedApplicationForHistory.status}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 font-medium">No status changes yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Application is currently in <span className="font-semibold">{selectedApplicationForHistory.status}</span> status
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end rounded-b-xl">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusHistoryModal(false);
                  setSelectedApplicationForHistory(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
