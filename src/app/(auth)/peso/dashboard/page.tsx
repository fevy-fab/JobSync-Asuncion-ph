'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/layout';
import { Card, Container, Badge, RefreshButton } from '@/components/ui';
import { SkeletonTile, SkeletonTable } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GraduationCap, Clock, User, UserCheck, Play, CheckCircle, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase/auth';
import { getStatusConfig } from '@/lib/config/statusConfig';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  activePrograms: number;
  enrolledCount: number;
  inProgressCount: number;
  completedCount: number;
}

interface RecentApplication {
  id: string;
  full_name: string;
  program_id: string;
  status: string;
  submitted_at: string;
  training_programs: {
    title: string;
  } | null;
}

export default function PESODashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    activePrograms: 0,
    enrolledCount: 0,
    inProgressCount: 0,
    completedCount: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Track component mount state to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    console.log('📊 Fetching PESO dashboard data...');

    // Only update loading state if component is still mounted
    if (isMounted.current) {
      setLoading(true);
    }
    try {
      // Get current user's ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // First, get all training programs created by this PESO user
      const { data: pesoPrograms } = await supabase
        .from('training_programs')
        .select('id')
        .eq('created_by', currentUser.id);

      const pesoProgramIds = pesoPrograms?.map(p => p.id) || [];

      // If PESO user has no programs, return zero stats
      if (pesoProgramIds.length === 0) {
        if (isMounted.current) {
          setStats({
            totalApplications: 0,
            pendingApplications: 0,
            activePrograms: 0,
            enrolledCount: 0,
            inProgressCount: 0,
            completedCount: 0,
          });
          setRecentApplications([]);
        }
        return;
      }

      // Run all 6 count queries + 1 data query in parallel (~6x faster)
      const [
        { count: totalApplications },
        { count: pendingApplications },
        { count: activePrograms },
        { count: enrolledCount },
        { count: inProgressCount },
        { count: completedCount },
        { data: applications, error },
      ] = await Promise.all([
        supabase
          .from('training_applications')
          .select('*', { count: 'exact', head: true })
          .in('program_id', pesoProgramIds),
        supabase
          .from('training_applications')
          .select('*', { count: 'exact', head: true })
          .in('program_id', pesoProgramIds)
          .eq('status', 'pending'),
        supabase
          .from('training_programs')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', currentUser.id)
          .eq('status', 'active'),
        supabase
          .from('training_applications')
          .select('*', { count: 'exact', head: true })
          .in('program_id', pesoProgramIds)
          .eq('status', 'enrolled'),
        supabase
          .from('training_applications')
          .select('*', { count: 'exact', head: true })
          .in('program_id', pesoProgramIds)
          .eq('status', 'in_progress'),
        supabase
          .from('training_applications')
          .select('*', { count: 'exact', head: true })
          .in('program_id', pesoProgramIds)
          .eq('status', 'completed'),
        supabase
          .from('training_applications')
          .select(`
            id,
            full_name,
            program_id,
            status,
            submitted_at,
            training_programs (
              title
            )
          `)
          .in('program_id', pesoProgramIds)
          .order('submitted_at', { ascending: false })
          .limit(5),
      ]);

      if (error) {
        console.error('Error fetching recent applications:', error);
      }

      // Only update state if component is still mounted
      if (isMounted.current) {
        setStats({
          totalApplications: totalApplications || 0,
          pendingApplications: pendingApplications || 0,
          activePrograms: activePrograms || 0,
          enrolledCount: enrolledCount || 0,
          inProgressCount: inProgressCount || 0,
          completedCount: completedCount || 0,
        });

        setRecentApplications((applications as any) || []);
      }
    } catch (error) {
      console.error('❌ Error fetching PESO dashboard data:', error);
      // Use showToast directly without including it in dependencies to avoid infinite loop
      if (isMounted.current) {
        showToast('Failed to load dashboard data', 'error');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []); // Empty deps - stable function, auth check moved to useEffect

  // Fetch data when authentication is ready - fixed race condition
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDashboardData();
    }
  }, [authLoading, isAuthenticated, fetchDashboardData]); // All dependencies to prevent race condition

  const tiles = [
    {
      title: 'Total Training Applications',
      value: loading ? '...' : stats.totalApplications.toString(),
      icon: User,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100 border-blue-500',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Pending Applications',
      value: loading ? '...' : stats.pendingApplications.toString(),
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100 border-orange-500',
      iconBg: 'bg-orange-500'
    },
    {
      title: 'Active Training Programs',
      value: loading ? '...' : stats.activePrograms.toString(),
      icon: GraduationCap,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100 border-purple-500',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Enrolled',
      value: loading ? '...' : stats.enrolledCount.toString(),
      icon: UserCheck,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100 border-purple-500',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'In Progress',
      value: loading ? '...' : stats.inProgressCount.toString(),
      icon: Play,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'from-teal-50 to-teal-100 border-teal-500',
      iconBg: 'bg-teal-500'
    },
    {
      title: 'Completed',
      value: loading ? '...' : stats.completedCount.toString(),
      icon: CheckCircle,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'from-gray-50 to-gray-100 border-gray-500',
      iconBg: 'bg-gray-500'
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = getStatusConfig(status);
    return {
      variant: statusConfig.badgeVariant,
      icon: statusConfig.icon,
      label: statusConfig.label,
    };
  };

  return (
    <AdminLayout
      role="PESO"
      userName={user?.fullName || 'PESO Admin'}
      pageTitle="Dashboard"
      pageDescription="Overview of training programs and applications"
    >
      <Container size="xl">
        <div className="space-y-8">
          {/* Refresh Button */}
          <div className="flex items-center justify-end">
            <RefreshButton
              onRefresh={fetchDashboardData}
              label="Refresh"
              showLastRefresh={true}
            />
          </div>

          {/* Dashboard Tiles */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiles.map((tile, index) => {
                const Icon = tile.icon;

                return (
                  <Card key={index} variant="flat" className={`bg-gradient-to-br ${tile.bgColor} border-l-4 hover:shadow-xl transition-all duration-300`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{tile.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{tile.value}</p>
                      </div>
                      <div className={`w-12 h-12 ${tile.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent Applications */}
          <Card title="RECENT APPLICATIONS" headerColor="bg-[#D4F4DD]" variant="elevated" className="hover:shadow-xl transition-shadow">
            {loading ? (
              <SkeletonTable rows={5} cols={3} />
            ) : recentApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-gray-700">No applications yet</p>
                <p className="text-sm mt-2">Applications will appear here once applicants start applying</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-all duration-200 cursor-pointer hover:border-[#22A555]/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{application.full_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <GraduationCap className="w-4 h-4" />
                          <span>{application.training_programs?.title || 'Unknown Program'}</span>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const statusBadge = getStatusBadge(application.status);
                      return (
                        <Badge variant={statusBadge.variant as any} icon={statusBadge.icon}>
                          {statusBadge.label}
                        </Badge>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Container>
    </AdminLayout>
  );
}
