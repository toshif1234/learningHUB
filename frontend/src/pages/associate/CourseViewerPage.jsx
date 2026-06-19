import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/courses';
import { progressAPI } from '../../api/progress';
import { assessmentsAPI } from '../../api/assessments';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  ExternalLink,
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function CourseViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [completing, setCompleting] = useState(false);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      // Load course & curriculum modules
      const courseRes = await coursesAPI.get(id);
      setCourse(courseRes.data);

      // Load progress
      const progressRes = await progressAPI.getCourseProgress(id);
      setCompletedModules(progressRes.data.completed_modules || []);

      // Load assessment associated with course
      try {
        const assessRes = await assessmentsAPI.getForCourse(id);
        const assessmentsList = assessRes.data || [];
        if (assessmentsList.length > 0) {
          setAssessment(assessmentsList[0]);
        }
      } catch (assessErr) {
        // quiet ignore
      }
    } catch (err) {
      toast.error('Failed to load course viewer content');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [id]);

  const handleMarkComplete = async (moduleId) => {
    try {
      setCompleting(true);
      const res = await progressAPI.completeModule(moduleId);
      setCompletedModules(res.data.completed_modules || []);
      toast.success('Module marked as complete!');
    } catch (err) {
      toast.error('Failed to update progress');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!course) return null;

  const modules = course.modules || [];
  const activeModule = modules[activeModuleIdx];
  const allCompleted = modules.length > 0 && modules.every((m) => completedModules.includes(m.id));

  return (
    <div id="course-viewer-container" className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)] animate-fade-in pb-12">
      {/* Left Column: Curriculum Navigation Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Back navigation */}
        <button
          id="viewer-back-to-dashboard-btn"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-100 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Info panel */}
        <div className="glass-card p-5 border border-dark-800 space-y-4">
          <div>
            <span className="badge badge-primary">{course.category}</span>
            <h2 className="text-lg font-bold text-white mt-2 leading-snug">{course.title}</h2>
          </div>
          <p className="text-xs text-dark-400 line-clamp-3 leading-relaxed">{course.description}</p>
        </div>

        {/* Modules syllabus list */}
        <div className="glass-card border border-dark-800 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-dark-750 bg-dark-900/60">
            <h3 className="font-bold text-xs text-dark-300 uppercase tracking-widest">Course Curriculum</h3>
          </div>
          <div className="overflow-y-auto p-1.5 flex-1 divide-y divide-dark-800/30">
            {modules.length === 0 ? (
              <div className="p-6 text-center text-xs text-dark-500">No modules in this course.</div>
            ) : (
              modules.map((m, idx) => {
                const isActive = idx === activeModuleIdx;
                const isCompleted = completedModules.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveModuleIdx(idx)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors ${
                      isActive ? 'bg-primary-500/10 text-primary-400 font-semibold' : 'hover:bg-dark-850/30 text-dark-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-dark-600 flex items-center justify-center text-[10px] font-bold text-dark-500">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs line-clamp-2 block leading-relaxed">{m.title}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Assessment Section */}
          <div className="p-4 border-t border-dark-750 bg-dark-900/40 mt-auto">
            {assessment ? (
              <button
                id="viewer-take-assessment-btn"
                onClick={() => navigate(`/my/assessments/${assessment.id}`)}
                disabled={!allCompleted}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 ${
                  allCompleted
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
                    : 'bg-dark-800 border border-dark-700/60 text-dark-500 cursor-not-allowed'
                }`}
              >
                {allCompleted ? (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    Take Final Assessment
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Locked - Complete Curriculum
                  </>
                )}
              </button>
            ) : (
              <div className="text-center text-xs text-dark-500 py-2 italic flex items-center justify-center gap-1.5 border border-dashed border-dark-800 rounded-xl">
                No quiz assessment configured
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Module Content Render */}
      <div className="flex-1 glass-card border border-dark-800 p-6 flex flex-col justify-between space-y-6">
        {activeModule ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Title */}
            <div>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                Module {activeModuleIdx + 1} of {modules.length}
              </span>
              <h1 className="text-2xl font-bold text-white mt-1.5">{activeModule.title}</h1>
            </div>

            {/* Content Renders */}
            <div className="flex-1 bg-dark-900 border border-dark-850 rounded-2xl p-6 min-h-96 flex flex-col">
              {/* Rich text type */}
              {activeModule.content_type === 'text' && (
                <div className="prose prose-invert text-dark-200 text-sm leading-relaxed max-w-none whitespace-pre-wrap">
                  {activeModule.text_content}
                </div>
              )}

              {/* PDF file / Image type */}
              {(activeModule.content_type === 'pdf' || activeModule.content_type === 'file') && activeModule.file_path && (
                <div className="flex-1 flex items-center justify-center w-full h-full min-h-[500px]">
                  {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activeModule.file_path) ? (
                    <img
                      src={`http://localhost:8000${activeModule.file_path}`}
                      alt={activeModule.title}
                      className="max-w-full max-h-[600px] rounded-xl object-contain border border-dark-800"
                    />
                  ) : (
                    <iframe
                      src={`http://localhost:8000${activeModule.file_path}`}
                      title={activeModule.title}
                      className="w-full h-full min-h-[500px] rounded-xl border border-dark-800"
                    />
                  )}
                </div>
              )}

              {/* Video or URL (when it is a video link) */}
              {(activeModule.content_type === 'video' || activeModule.content_type === 'url') && activeModule.external_url && 
               (activeModule.external_url.includes('youtube.com') || 
                activeModule.external_url.includes('youtu.be') || 
                activeModule.external_url.includes('vimeo.com') ||
                /\.(mp4|webm|ogg)$/i.test(activeModule.external_url)) && (
                <div className="flex-1 flex items-center justify-center">
                  {activeModule.external_url.includes('youtube.com') || activeModule.external_url.includes('youtu.be') ? (
                    <iframe
                      src={activeModule.external_url.includes('youtu.be') 
                        ? `https://www.youtube.com/embed/${activeModule.external_url.split('/').pop().split('?')[0]}`
                        : activeModule.external_url.replace('watch?v=', 'embed/')}
                      title={activeModule.title}
                      className="w-full h-full min-h-[400px] rounded-xl border border-dark-800"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-center space-y-4">
                      <PlayCircle className="w-16 h-16 text-primary-400 mx-auto stroke-[1.2]" />
                      <p className="text-sm text-dark-300">External Video resource located outside the platform</p>
                      <a
                        href={activeModule.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-4"
                      >
                        Launch Video
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Link or URL (when it is NOT a video link) */}
              {((activeModule.content_type === 'link' || activeModule.content_type === 'url') && activeModule.external_url && 
                !(activeModule.external_url.includes('youtube.com') || 
                  activeModule.external_url.includes('youtu.be') || 
                  activeModule.external_url.includes('vimeo.com') ||
                  /\.(mp4|webm|ogg)$/i.test(activeModule.external_url))) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <FileText className="w-16 h-16 text-indigo-400 stroke-[1.2]" />
                  <div>
                    <h3 className="font-bold text-white text-base">External Reference Link</h3>
                    <p className="text-xs text-dark-400 mt-1 max-w-md">
                      This module requires reading documentation hosted externally. Please click the button below to launch the resource.
                    </p>
                  </div>
                  <a
                    href={activeModule.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-6 shadow-md"
                  >
                    Open Resource
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Bottom Status bar */}
            <div className="flex justify-between items-center border-t border-dark-800 pt-5 mt-auto">
              <div>
                {completedModules.includes(activeModule.id) ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    You completed this module
                  </span>
                ) : (
                  <span className="text-xs text-dark-400">Review material to mark it complete</span>
                )}
              </div>

              {!completedModules.includes(activeModule.id) && (
                <button
                  id={`viewer-mark-complete-btn-${activeModule.id}`}
                  onClick={() => handleMarkComplete(activeModule.id)}
                  disabled={completing}
                  className="btn-primary py-2 px-6 text-xs flex items-center gap-1 bg-gradient-to-r from-primary-600 to-indigo-500"
                >
                  {completing ? 'Updating...' : 'Mark as Complete'}
                  {!completing && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-dark-500">
            <BookOpen className="w-12 h-12 mb-2 stroke-[1.2]" />
            <p className="text-sm">Select a module from the curriculum sidebar to start learning</p>
          </div>
        )}
      </div>
    </div>
  );
}
