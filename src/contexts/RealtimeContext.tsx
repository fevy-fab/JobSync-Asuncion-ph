'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/auth';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Real-time subscription context
 * Manages Supabase real-time subscriptions for critical data
 */
interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  unreadNotificationsCount: number;
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, role } = useAuth();
  const { showToast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Derived for backward compat
  const isConnected = connectionStatus === 'connected';

  // Track channels to prevent duplicates
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const subscriptionInitialized = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  // Store showToast in a ref to prevent it from triggering re-subscriptions
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  /**
   * Fetch unread notifications count
   */
  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadNotificationsCount(count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }, [user]);

  /**
   * Clean up all channels and reset state
   */
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
    subscriptionInitialized.current = false;
  }, []);

  /**
   * Handle channel status changes with reconnection logic
   */
  const handleChannelStatus = useCallback((status: string, err?: Error) => {
    switch (status) {
      case 'SUBSCRIBED':
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;
        break;
      case 'TIMED_OUT':
      case 'CHANNEL_ERROR':
        console.warn(`Realtime channel ${status}:`, err);
        setConnectionStatus('reconnecting');
        // Schedule reconnection with exponential backoff
        if (!reconnectTimeoutRef.current) {
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
            MAX_RECONNECT_DELAY
          );
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            // Teardown and re-initialize
            cleanupChannels();
          }, delay);
        }
        break;
      case 'CLOSED':
        setConnectionStatus('disconnected');
        break;
    }
  }, [cleanupChannels]);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    // Only subscribe if authenticated and not already subscribed
    if (!isAuthenticated || !user || subscriptionInitialized.current) {
      return;
    }

    console.log('Setting up real-time subscriptions for user:', user.email);
    subscriptionInitialized.current = true;
    setConnectionStatus('connecting');

    // Generate unique channel names using timestamp
    const timestamp = Date.now();
    const notificationsChannelName = `notifications-${user.id}-${timestamp}`;
    const applicationsChannelName = `applications-${user.id}-${timestamp}`;

    /**
     * Subscribe to notifications table
     */
    const notificationsChannel = supabase
      .channel(notificationsChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          const notification = payload.new as any;

          // Increment unread count
          setUnreadNotificationsCount(prev => prev + 1);

          // Show toast for new notification
          showToastRef.current(notification.title || 'New Notification', 'info');
        }
      )
      .subscribe((status, err) => {
        console.log(`Notifications channel status: ${status}`);
        handleChannelStatus(status, err);
        if (status === 'SUBSCRIBED') {
          refreshNotifications();
        }
      });

    channelsRef.current.push(notificationsChannel);

    /**
     * Subscribe to applications table (for applicants and HR)
     */
    if (role === 'APPLICANT' || role === 'HR') {
      const applicationsChannel = supabase
        .channel(applicationsChannelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'applications',
            filter: role === 'APPLICANT' ? `applicant_id=eq.${user.id}` : undefined
          },
          (payload) => {
            console.log('Application updated:', payload);
            const application = payload.new as any;

            // Show toast if status changed
            if (payload.old && (payload.old as any).status !== application.status) {
              showToastRef.current(
                `Application ${application.status}`,
                application.status === 'approved' ? 'success' : application.status === 'denied' ? 'error' : 'info'
              );
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`Applications channel status: ${status}`);
          handleChannelStatus(status, err);
        });

      channelsRef.current.push(applicationsChannel);
    }

    /**
     * Subscribe to training_applications table (for applicants and PESO)
     */
    if (role === 'APPLICANT' || role === 'PESO') {
      const trainingChannelName = `training-${user.id}-${timestamp}`;
      const trainingChannel = supabase
        .channel(trainingChannelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'training_applications',
            filter: role === 'APPLICANT' ? `applicant_id=eq.${user.id}` : undefined
          },
          (payload) => {
            console.log('Training application updated:', payload);
            const application = payload.new as any;

            // Show toast if status changed
            if (payload.old && (payload.old as any).status !== application.status) {
              showToastRef.current(
                `Training application ${application.status}`,
                application.status === 'approved' ? 'success' : application.status === 'denied' ? 'error' : 'info'
              );
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`Training channel status: ${status}`);
          handleChannelStatus(status, err);
        });

      channelsRef.current.push(trainingChannel);
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      cleanupChannels();
      setConnectionStatus('disconnected');
    };
  }, [isAuthenticated, user, role, handleChannelStatus, cleanupChannels, refreshNotifications]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        connectionStatus,
        unreadNotificationsCount,
        refreshNotifications
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
