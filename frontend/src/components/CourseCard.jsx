import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Users, Tag } from 'lucide-react';
import ProgressBar from './ProgressBar';
import CountdownTimer from './CountdownTimer';

export default function CourseCard({ course, enrollment, assignment, onClick, actions, className = '' }) {
  const navigate = useNavigate();

  const categoryColors = {
    technical: 'from-blue-500 to-cyan-500',
    soft_skills: 'from-purple-500 to-pink-500',
    compliance: 'from-amber-500 to-orange-500',
    leadership: 'from-emerald-500 to-teal-500',
    default: 'from-primary-500 to-indigo-500',
  };

  const gradientClass = categoryColors[course?.category] || categoryColors.default;

  const handleClick = () => {
    if (onClick) {
      onClick(course);
    }
  };

  return (
    <div
      id={`course-card-${course?.id || 'unknown'}`}
      className={`glass-card-hover group cursor-pointer overflow-hidden animate-slide-up ${className}`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden">
        {course?.thumbnail_url ? (
          <img
            src={`http://localhost:8000${course.thumbnail_url}`}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center`}>
            <BookOpen className="w-12 h-12 text-white/60" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className={`badge ${course?.course_type === 'assigned' ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
            {course?.course_type === 'assigned' ? 'Assigned' : 'Free'}
          </span>
        </div>

        {/* Category */}
        <div className="absolute bottom-3 left-3">
          <span className="badge bg-dark-900/80 text-dark-200 backdrop-blur-sm">
            <Tag className="w-3 h-3 mr-1" />
            {course?.category?.replace('_', ' ') || 'General'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-dark-100 text-lg mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
          {course?.title || 'Untitled Course'}
        </h3>

        <p className="text-sm text-dark-400 mb-3 line-clamp-2">
          {course?.description || 'No description available'}
        </p>

        <div className="flex items-center gap-4 text-xs text-dark-500 mb-3">
          {course?.duration_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.duration_hours}h
            </span>
          )}
          {course?.module_count !== undefined && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {course.module_count} modules
            </span>
          )}
        </div>

        {/* Progress bar for enrolled/assigned */}
        {(enrollment || assignment) && (
          <div className="mt-3">
            <ProgressBar
              value={enrollment?.progress || assignment?.progress || 0}
              size="sm"
              showLabel={true}
            />
          </div>
        )}

        {/* Deadline countdown for assigned */}
        {assignment?.deadline && (
          <div className="mt-3 pt-3 border-t border-dark-700/50">
            <CountdownTimer deadline={assignment.deadline} />
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="mt-3 pt-3 border-t border-dark-700/50 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
