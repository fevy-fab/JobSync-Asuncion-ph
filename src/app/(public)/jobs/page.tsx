'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { JobCard } from '@/components/public/JobCard';
import { JobDetailsModal } from '@/components/public/JobDetailsModal';
import {
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  Award,
  Users,
  Search,
  Loader2,
  Calendar,
  Building2,
  Home
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  degree_requirement: string;
  eligibilities: string[];
  skills: string[];
  years_of_experience: number;
  min_years_experience: number | null;
  max_years_experience: number | null;
  experience: string | null;
  location: string | null;
  employment_type: string | null;
  remote: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jobs?status=active');
      const result = await response.json();
      setJobs(result.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Filter logic
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || job.employment_type === filterType;
    const matchesLocation = filterLocation === 'all' ||
      (filterLocation === 'remote' && job.remote) ||
      (filterLocation === 'onsite' && !job.remote);
    return matchesSearch && matchesType && matchesLocation;
  });

  // Get unique employment types and locations
  const employmentTypes = Array.from(new Set(jobs.map(j => j.employment_type).filter(Boolean)));

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isNew = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#22A555] to-[#1a8045] text-white py-16">
        <Container size="xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Next Opportunity
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Browse available job openings at the Municipality of Asuncion
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Account to Apply
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
                <Briefcase className="w-6 h-6 text-[#22A555]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{jobs.length}</div>
                <div className="text-sm text-gray-600">Active Positions</div>
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
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Public Service</div>
                <div className="text-sm text-gray-600">Serve the Community</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search jobs by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employment Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]/20 focus:border-[#22A555]"
              >
                <option value="all">All Types</option>
                {employmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]/20 focus:border-[#22A555]"
              >
                <option value="all">All Locations</option>
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A555]" />
            <span className="ml-3 text-gray-600">Loading jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterType !== 'all' || filterLocation !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onView={handleViewJob} />
            ))}
          </div>
        )}

        {/* Bottom CTA Banner */}
        {!loading && filteredJobs.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-[#22A555] to-[#1a8045] rounded-lg p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Ready to Start Your Career?</h3>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Create your account today and apply to positions that match your skills and experience.
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Free Account
              </Button>
            </Link>
          </div>
        )}
      </Container>

      {/* Job Details Modal */}
      {showModal && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={showModal}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
