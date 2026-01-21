'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ModernModal } from '@/components/ui/ModernModal';
import {
  Megaphone,
  Calendar,
  Tag,
  ImageIcon,
  Loader2,
  Users,
  Filter,
  Building2,
  Bell
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export default function PublicAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/announcements?status=active');
      const data = await response.json();
      setAnnouncements(data.data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'job_opening': return 'bg-blue-100 text-blue-800';
      case 'training': return 'bg-purple-100 text-purple-800';
      case 'notice': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted 1 day ago';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 14) return 'Posted 1 week ago';
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  // Filter announcements by category
  const filteredAnnouncements = selectedCategory === 'all'
    ? announcements
    : announcements.filter(a => a.category === selectedCategory);

  const categories = [
    { value: 'all', label: 'All', count: announcements.length },
    { value: 'job_opening', label: 'Job Openings', count: announcements.filter(a => a.category === 'job_opening').length },
    { value: 'training', label: 'Trainings', count: announcements.filter(a => a.category === 'training').length },
    { value: 'notice', label: 'Notices', count: announcements.filter(a => a.category === 'notice').length },
    { value: 'general', label: 'General', count: announcements.filter(a => a.category === 'general').length },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#22A555] to-[#1a8045] text-white py-16">
        <Container size="xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Latest Announcements
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Stay updated with news, job openings, and training programs from the Municipality of Asuncion
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Account for Updates
              </Button>
            </Link>
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container size="xl" className="py-12">
        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#22A555]/10 rounded-lg flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-[#22A555]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{announcements.length}</div>
                <div className="text-sm text-gray-600">Active Announcements</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Municipal Hall</div>
                <div className="text-sm text-gray-600">Asuncion, Davao del Norte</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Official Updates</div>
                <div className="text-sm text-gray-600">From HR & PESO</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by category:</span>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-[#22A555] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredAnnouncements.length} of {announcements.length} announcements
          </div>
        </div>

        {/* Announcements Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A555]" />
            <span className="ml-3 text-gray-600">Loading announcements...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No announcements found</h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === 'all'
                ? 'Check back later for updates'
                : `No ${formatCategory(selectedCategory).toLowerCase()} announcements available`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => handleViewAnnouncement(announcement)}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300">
                  {announcement.image_url ? (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {/* Category Badge Overlay */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md ${getCategoryBadgeColor(announcement.category)}`}>
                      <Tag className="w-3 h-3 inline mr-1" />
                      {formatCategory(announcement.category)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  {/* Title */}
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-[#22A555] transition-colors">
                    {announcement.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {announcement.description}
                  </p>

                  {/* Metadata */}
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    {/* Published Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(announcement.published_at)}</span>
                    </div>

                    {/* Creator Info */}
                    {announcement.profiles && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#22A555]/10 rounded-full flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-[#22A555]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {announcement.profiles.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {announcement.profiles.role}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA Banner */}
        {!loading && filteredAnnouncements.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-[#22A555] to-[#1a8045] rounded-lg p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Never Miss an Update</h3>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Create an account to receive notifications about new job openings, training programs, and important announcements.
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Free Account
              </Button>
            </Link>
          </div>
        )}
      </Container>

      {/* Announcement Modal */}
      {showModal && (
        <ModernModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Announcement Details"
          subtitle="View full announcement"
          colorVariant="green"
          icon={Megaphone}
          size="lg"
        >
          <div className="space-y-6">
            {/* Image */}
            {selectedAnnouncement.image_url && (
              <div className="relative w-full h-64 rounded-xl overflow-hidden">
                <img
                  src={selectedAnnouncement.image_url}
                  alt={selectedAnnouncement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Category Badge */}
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${getCategoryBadgeColor(selectedAnnouncement.category)}`}>
                <Tag className="w-4 h-4" />
                {formatCategory(selectedAnnouncement.category)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">{selectedAnnouncement.title}</h1>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(selectedAnnouncement.published_at)}</span>
              </div>
              {selectedAnnouncement.profiles && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{selectedAnnouncement.profiles.full_name} ({selectedAnnouncement.profiles.role})</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedAnnouncement.description}</p>
            </div>

            {/* CTA */}
            <div className="pt-4 border-t border-gray-200">
              <Link href="/login" onClick={() => setShowModal(false)}>
                <Button variant="primary" className="w-full">
                  Login to See More Updates
                </Button>
              </Link>
            </div>
          </div>
        </ModernModal>
      )}
    </main>
  );
}
