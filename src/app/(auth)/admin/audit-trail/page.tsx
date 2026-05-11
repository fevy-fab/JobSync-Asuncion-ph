'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Avatar,
  Card,
  EnhancedTable,
  Container,
  Badge,
  RefreshButton,
  Modal,
  ImagePreviewModal,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { SkeletonTable, SkeletonTile } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/auth';
import {
  FileText,
  Database,
  User,
  Clock,
  AlertTriangle,
  Eye,
  Plus,
  Edit,
  Trash2,
  FileCheck,
} from 'lucide-react';

interface AuditRecord {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any | null;
  new_values: any | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  timestamp: string;
  profiles?: {
    full_name?: string;
    profile_image_url?: string | null;
  };
}

const PAGE_SIZE = 50;
const FILTER_OPTIONS_PAGE_SIZE = 1000;

const getThreeMonthsAgoIso = () => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);
  return threeMonthsAgo.toISOString();
};

const sanitizeSearchTerm = (value: string) => {
  return value.trim().replace(/[%_,]/g, '');
};

export default function AuditTrailPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [tableNameOptions, setTableNameOptions] = useState<string[]>([]);
  const [userEmailOptions, setUserEmailOptions] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  // Server-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Stats states
  const [insertCount, setInsertCount] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);

  // Filter states
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Image Preview Modal
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewUserName, setPreviewUserName] = useState<string>('');

  // Debounce search so it does not query the database on every key press
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const applyFiltersToQuery = useCallback((query: any, threeMonthsAgoIso: string) => {
    let filteredQuery = query.gte('timestamp', threeMonthsAgoIso);

    if (tableFilter !== 'all') {
      filteredQuery = filteredQuery.eq('table_name', tableFilter);
    }

    if (operationFilter !== 'all') {
      filteredQuery = filteredQuery.eq('operation', operationFilter);
    }

    if (userFilter !== 'all') {
      if (userFilter === 'system') {
        filteredQuery = filteredQuery.is('user_email', null);
      } else {
        filteredQuery = filteredQuery.eq('user_email', userFilter);
      }
    }

    const safeSearchTerm = sanitizeSearchTerm(debouncedSearchTerm);

    if (safeSearchTerm) {
      filteredQuery = filteredQuery.or(
        `table_name.ilike.%${safeSearchTerm}%,record_id.ilike.%${safeSearchTerm}%,user_email.ilike.%${safeSearchTerm}%`
      );
    }

    return filteredQuery;
  }, [tableFilter, operationFilter, userFilter, debouncedSearchTerm]);

  // Fetch table/user filter options from all audit records within the last 3 months.
  // This fetches only table_name and user_email, not the heavy JSON values.
  const fetchAuditFilterOptions = useCallback(async () => {
    try {
      const threeMonthsAgoIso = getThreeMonthsAgoIso();

      let from = 0;
      let hasMore = true;

      const tableNameSet = new Set<string>();
      const emailSet = new Set<string | null>();

      while (hasMore) {
        const to = from + FILTER_OPTIONS_PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('audit_trail')
          .select('table_name, user_email')
          .gte('timestamp', threeMonthsAgoIso)
          .order('timestamp', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Error fetching audit filter options:', error);
          throw error;
        }

        const batch = (data || []) as Array<{
          table_name: string;
          user_email: string | null;
        }>;

        batch.forEach((record) => {
          if (record.table_name) {
            tableNameSet.add(record.table_name);
          }

          emailSet.add(record.user_email || null);
        });

        hasMore = batch.length === FILTER_OPTIONS_PAGE_SIZE;
        from += FILTER_OPTIONS_PAGE_SIZE;
      }

      const sortedTables = Array.from(tableNameSet).sort();

      const sortedEmails = Array.from(emailSet).sort((a, b) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a.localeCompare(b);
      });

      setTableNameOptions(sortedTables);
      setUserEmailOptions(sortedEmails);
    } catch (error: any) {
      console.error('Failed to fetch audit filter options:', error);
      showToast(getErrorMessage(error), 'error');
    }
  }, [showToast]);

  // Fetch operation counts without loading thousands of rows
  const fetchAuditStats = useCallback(async () => {
    const threeMonthsAgoIso = getThreeMonthsAgoIso();

    const createCountQuery = (operation: 'INSERT' | 'UPDATE' | 'DELETE') => {
      const query = supabase
        .from('audit_trail')
        .select('id', { count: 'exact', head: true })
        .eq('operation', operation);

      return applyFiltersToQuery(query, threeMonthsAgoIso);
    };

    const [insertResult, updateResult, deleteResult] = await Promise.all([
      createCountQuery('INSERT'),
      createCountQuery('UPDATE'),
      createCountQuery('DELETE'),
    ]);

    if (insertResult.error) throw insertResult.error;
    if (updateResult.error) throw updateResult.error;
    if (deleteResult.error) throw deleteResult.error;

    setInsertCount(insertResult.count || 0);
    setUpdateCount(updateResult.count || 0);
    setDeleteCount(deleteResult.count || 0);
  }, [applyFiltersToQuery]);

  // Fetch audit trail using server-side pagination
  const fetchAuditTrail = useCallback(
    async (showSuccessMessage = false) => {
      try {
        setIsLoading(true);

        const threeMonthsAgoIso = getThreeMonthsAgoIso();
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('audit_trail')
          .select(
            `
            *,
            profiles:user_id (
              full_name,
              profile_image_url
            )
          `,
            { count: 'exact' }
          )
          .order('timestamp', { ascending: false });

        query = applyFiltersToQuery(query, threeMonthsAgoIso);

        const { data, error, count } = await query.range(from, to);

        if (error) {
          console.error('Error fetching audit trail:', error);
          throw error;
        }

        setAuditRecords((data || []) as AuditRecord[]);
        setTotalCount(count || 0);

        await fetchAuditStats();

        if (showSuccessMessage) {
          showToast('Audit trail refreshed', 'success');
        }
      } catch (error: any) {
        console.error('Failed to fetch audit trail:', error);
        showToast(getErrorMessage(error), 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      applyFiltersToQuery,
      fetchAuditStats,
      showToast,
    ]
  );

  useEffect(() => {
    fetchAuditFilterOptions();
  }, [fetchAuditFilterOptions]);

  useEffect(() => {
    fetchAuditTrail(false);
  }, [fetchAuditTrail]);

  // Reset page when filters change
  const handleTableFilterChange = (value: string) => {
    setCurrentPage(1);
    setTableFilter(value);
  };

  const handleOperationFilterChange = (value: string) => {
    setCurrentPage(1);
    setOperationFilter(value);
  };

  const handleUserFilterChange = (value: string) => {
    setCurrentPage(1);
    setUserFilter(value);
  };

  // Handle avatar click to show image preview
  const handleAvatarClick = (imageUrl: string | null | undefined, userName: string) => {
    if (imageUrl) {
      setPreviewImageUrl(imageUrl);
      setPreviewUserName(userName);
      setShowImagePreview(true);
    }
  };

  const uniqueTables = tableNameOptions;
  const uniqueUsers = userEmailOptions;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalCount);

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge variant="success" icon={Plus}>INSERT</Badge>;
      case 'UPDATE':
        return <Badge variant="info" icon={Edit}>UPDATE</Badge>;
      case 'DELETE':
        return <Badge variant="danger" icon={Trash2}>DELETE</Badge>;
      default:
        return <Badge variant="default">{operation}</Badge>;
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'jobs':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'applications':
        return <FileCheck className="w-4 h-4 text-green-600" />;
      case 'announcements':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'profiles':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatJson = (data: any) => {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  };

  const columns = [
    {
      header: 'Time',
      accessor: 'timestamp' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">
            {new Date(value).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Table',
      accessor: 'table_name' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {getTableIcon(value)}
          <span className="font-mono text-sm font-semibold text-gray-900">
            {value}
          </span>
        </div>
      ),
    },
    {
      header: 'Operation',
      accessor: 'operation' as const,
      render: (value: string) => getOperationBadge(value),
    },
    {
      header: 'Record ID',
      accessor: 'record_id' as const,
      render: (value: string) => (
        <span className="font-mono text-xs text-gray-600">
          {value.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: 'Changed Fields',
      accessor: 'changed_fields' as const,
      render: (value: string[] | null) => {
        if (!value || value.length === 0) {
          return <span className="text-gray-400">-</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((field, idx) => (
              <Badge key={idx} variant="default" className="text-xs">
                {field}
              </Badge>
            ))}
            {value.length > 3 && (
              <span className="text-xs text-gray-500">
                +{value.length - 3} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'User',
      accessor: 'user_email' as const,
      render: (value: string | null, row: AuditRecord) => (
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
          <div className="flex flex-col">
            {value ? (
              <>
                <span className="text-sm text-gray-900">{value}</span>
                {row.user_role && (
                  <Badge variant="default" className="text-xs w-fit">
                    {row.user_role}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-500 italic">System</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Details',
      accessor: 'actions' as const,
      render: (_: any, row: AuditRecord) => (
        <button
          onClick={() => setSelectedRecord(row)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
      ),
    },
  ];

  const stats = {
    total: totalCount,
    inserts: insertCount,
    updates: updateCount,
    deletes: deleteCount,
  };

  return (
    <AdminLayout
      role="Admin"
      userName={user?.fullName || 'Admin'}
      pageTitle="Audit Trail"
      pageDescription="Complete database change history with before/after values"
    >
      <Container size="xl">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              {/* Search */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search table, user, or record ID..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555] min-w-[260px]"
              />

              {/* Table Filter */}
              <select
                value={tableFilter}
                onChange={(e) => handleTableFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]"
              >
                <option value="all">All Tables</option>
                {uniqueTables.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>

              {/* Operation Filter */}
              <select
                value={operationFilter}
                onChange={(e) => handleOperationFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]"
              >
                <option value="all">All Operations</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>

              {/* User Filter */}
              <select
                value={userFilter}
                onChange={(e) => handleUserFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map((userEmail) => (
                  <option key={userEmail || 'system'} value={userEmail || 'system'}>
                    {userEmail || '(System)'}
                  </option>
                ))}
              </select>
            </div>

            <RefreshButton
              onRefresh={async () => {
                await Promise.all([
                  fetchAuditTrail(true),
                  fetchAuditFilterOptions(),
                ]);
              }}
              label="Refresh Audit Trail"
              showLastRefresh={true}
            />
          </div>

          {/* Summary Stats */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Changes</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Inserts</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.inserts}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card variant="flat" className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Updates</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.updates}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card variant="flat" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Deletes</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.deletes}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Audit Trail Table */}
          <Card title="AUDIT TRAIL RECORDS" headerColor="bg-[#D4F4DD]">
            {isLoading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : auditRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No audit records found from the last 3 months
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
                    {' '}audit record(s) from the last 3 months
                  </p>

                  <p>
                    Page {currentPage} of {totalPages}
                  </p>
                </div>

                <EnhancedTable
                  columns={columns}
                  data={auditRecords}
                  searchable={false}
                  paginated={false}
                  pageSize={PAGE_SIZE}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
        </div>
      </Container>

      {/* Audit Record Details Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Audit Record Details"
        size="xl"
        showFooter={false}
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Metadata Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Table:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getTableIcon(selectedRecord.table_name)}
                    <span className="font-mono font-semibold text-gray-900">
                      {selectedRecord.table_name}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Operation:</span>
                  <div className="mt-1">{getOperationBadge(selectedRecord.operation)}</div>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Record ID:</span>
                  <p className="font-mono text-xs text-gray-600 mt-1">
                    {selectedRecord.record_id}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Timestamp:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(selectedRecord.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="font-semibold text-gray-700">User:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-400" />
                    {selectedRecord.user_email ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{selectedRecord.user_email}</span>
                        {selectedRecord.user_role && (
                          <Badge variant="default" className="text-xs">
                            {selectedRecord.user_role}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">System</span>
                    )}
                  </div>
                </div>

                {selectedRecord.changed_fields && selectedRecord.changed_fields.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Changed Fields:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedRecord.changed_fields.map((field, idx) => (
                        <Badge key={idx} variant="default" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Values */}
              {selectedRecord.old_values && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Before (Old Values)
                  </h4>
                  <pre className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    {formatJson(selectedRecord.old_values)}
                  </pre>
                </div>
              )}

              {/* New Values */}
              {selectedRecord.new_values && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    After (New Values)
                  </h4>
                  <pre className="bg-green-50 border border-green-200 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    {formatJson(selectedRecord.new_values)}
                  </pre>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!selectedRecord.old_values && !selectedRecord.new_values && (
              <div className="text-center py-8 text-gray-500">
                No before/after data available for this operation
              </div>
            )}
          </div>
        )}
      </Modal>

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