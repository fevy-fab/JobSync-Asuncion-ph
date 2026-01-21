'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TrainingCard } from '@/components/public/TrainingCard';
import { TrainingDetailsModal } from '@/components/public/TrainingDetailsModal';
import {
  GraduationCap,
  Clock,
  Calendar,
  MapPin,
  Users,
  Search,
  Loader2,
  Award,
  Filter,
  Laptop,
  Briefcase,
  BarChart3,
  Palette,
  Wrench,
  BookOpen,
  Code,
  Lightbulb
} from 'lucide-react';

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  schedule: string | null;
  capacity: number;
  enrolled_count: number;
  location: string | null;
  speaker_name?: string;
  start_date: string;
  end_date: string | null;
  skills_covered: string[];
  icon: string;
  status: 'active' | 'upcoming' | 'archived';
  created_by: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export default function PublicTrainingsPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [selectedTraining, setSelectedTraining] = useState<TrainingProgram | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/training/programs?status=active');
      const result = await response.json();
      setPrograms(result.data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Helper function to check if program is new (created within last 7 days)
  const isNewProgram = (createdAt: string) => {
    const programDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - programDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Helper function to check if program is starting soon (within 7 days)
  const isStartingSoon = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const handleViewTraining = (training: TrainingProgram) => {
    setSelectedTraining(training);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTraining(null);
  };

  // Filter programs with search and filters
  const filteredPrograms = programs.filter(program => {
    const availableSlots = program.capacity - program.enrolled_count;
    const availabilityPercent = (availableSlots / program.capacity) * 100;

    // Search filter
    const matchesSearch = searchQuery === '' ||
      program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.skills_covered?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    // Duration filter
    const matchesDuration = filterDuration === 'all' || (() => {
      const durationLower = program.duration.toLowerCase();
      if (filterDuration === 'short') {
        return durationLower.includes('week') || durationLower.includes('1 month');
      } else if (filterDuration === 'medium') {
        return durationLower.includes('2 month') || durationLower.includes('3 month');
      } else if (filterDuration === 'long') {
        return durationLower.includes('4 month') || durationLower.includes('5 month') ||
               durationLower.includes('6 month') || durationLower.includes('year');
      }
      return true;
    })();

    // Availability filter
    const matchesAvailability = filterAvailability === 'all' || (() => {
      if (filterAvailability === 'available') return availableSlots > 0;
      if (filterAvailability === 'full') return availableSlots === 0;
      if (filterAvailability === 'almost-full') return availabilityPercent < 20 && availableSlots > 0;
      return true;
    })();

    return matchesSearch && matchesDuration && matchesAvailability;
  });

  const getSlotColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage > 50) return 'text-green-600 bg-green-100';
    if (percentage > 20) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // Map icon string to lucide-react icon component
  const getIconComponent = (iconString: string | null | undefined) => {
    const iconMap: { [key: string]: any } = {
      'laptop': Laptop,
      'briefcase': Briefcase,
      'chart': BarChart3,
      'palette': Palette,
      'wrench': Wrench,
      'book': BookOpen,
      'code': Code,
      'lightbulb': Lightbulb,
      'graduation': GraduationCap,
      'award': Award,
    };

    if (!iconString) return GraduationCap;

    const key = iconString.toLowerCase().trim();
    return iconMap[key] || GraduationCap;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#22A555] to-[#1a8045] text-white py-16">
        <Container size="xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Free Skills Training Programs
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Enhance your skills with free training programs offered by PESO Asuncion
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Account to Enroll
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
                <GraduationCap className="w-6 h-6 text-[#22A555]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{programs.length}</div>
                <div className="text-sm text-gray-600">Active Programs</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {programs.reduce((sum, p) => sum + (p.capacity - p.enrolled_count), 0)}
                </div>
                <div className="text-sm text-gray-600">Available Slots</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Free Certificates</div>
                <div className="text-sm text-gray-600">Upon Completion</div>
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
                  placeholder="Search programs by title, description, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Duration Filter */}
            <div>
              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]/20 focus:border-[#22A555]"
              >
                <option value="all">All Durations</option>
                <option value="short">Short (&lt; 1 month)</option>
                <option value="medium">Medium (1-3 months)</option>
                <option value="long">Long (3+ months)</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22A555]/20 focus:border-[#22A555]"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="almost-full">Almost Full</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredPrograms.length} of {programs.length} programs
          </div>
        </div>

        {/* Training Programs Listing */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A555]" />
            <span className="ml-3 text-gray-600">Loading programs...</span>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No programs found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterDuration !== 'all' || filterAvailability !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for new training opportunities'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <TrainingCard key={program.id} training={program} onView={handleViewTraining} />
            ))}
          </div>
        )}

        {/* Bottom CTA Banner */}
        {!loading && filteredPrograms.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-[#22A555] to-[#1a8045] rounded-lg p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Ready to Enhance Your Skills?</h3>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Create your account today and enroll in free training programs with certificates upon completion.
            </p>
            <Link href="/register">
              <Button variant="success" size="lg" className="bg-white text-[#22A555] hover:bg-gray-100">
                Create Free Account
              </Button>
            </Link>
          </div>
        )}
      </Container>

      {/* Training Details Modal */}
      {showModal && (
        <TrainingDetailsModal
          training={selectedTraining}
          isOpen={showModal}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
