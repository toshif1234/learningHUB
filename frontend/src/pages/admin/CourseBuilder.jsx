import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/courses';
import { assessmentsAPI } from '../../api/assessments';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Layers,
  Award,
  Check,
  ChevronUp,
  ChevronDown,
  FileText,
  Link as LinkIcon,
  Video,
  X,
  PlusCircle
} from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function CourseBuilder() {
  const { id } = useParams(); // undefined for create, populated for edit
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [step, setStep] = useState(1); // 1: Info, 2: Modules, 3: Assessment, 4: Review

  // Step 1: Course Info State
  const [courseInfo, setCourseInfo] = useState({
    title: '',
    description: '',
    category: 'Engineering',
    course_type: 'assigned',
    content_type: 'custom',
    duration_minutes: 60,
    is_published: false,
    external_url: ''
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  // Step 2: Modules State
  const [modules, setModules] = useState([]);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    content_type: 'text', // 'text', 'file', 'url'
    content_text: '',
    external_url: '',
    order_index: 0
  });
  const [moduleFile, setModuleFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 3: Assessment State
  const [hasAssessment, setHasAssessment] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [assessmentSettings, setAssessmentSettings] = useState({
    title: 'Final Assessment',
    description: 'Please complete this assessment to verify your course completion.',
    pass_percentage: 70,
    time_limit_minutes: 30,
    max_attempts: 3,
    shuffle_questions: false,
    shuffle_options: false,
    show_correct_answers: 'never'
  });
  const [questions, setQuestions] = useState([]);

  // Load course details in edit mode
  useEffect(() => {
    if (isEditMode) {
      const loadCourseData = async () => {
        try {
          // Load Course
          const courseRes = await coursesAPI.get(id);
          const c = courseRes.data;
          setCourseInfo({
            title: c.title || '',
            description: c.description || '',
            category: c.category || 'Engineering',
            course_type: c.course_type || 'assigned',
            content_type: c.content_type || 'custom',
            duration_minutes: c.duration_minutes || 60,
            is_published: c.is_published || false,
            external_url: c.external_url || ''
          });
          if (c.thumbnail_url) {
            setThumbnailPreview(`http://10.18.138.234:8000${c.thumbnail_url}`);
          }
          setModules(c.modules || []);

          // Load Assessment
          try {
            const assessRes = await assessmentsAPI.getForCourse(id);
            const assessmentsList = assessRes.data || [];
            if (assessmentsList.length > 0) {
              const assess = assessmentsList[0];
              setHasAssessment(true);
              setAssessmentId(assess.id);
              setAssessmentSettings({
                title: assess.title || 'Final Assessment',
                description: assess.description || '',
                pass_percentage: assess.pass_percentage || 70,
                time_limit_minutes: assess.time_limit_minutes || 30,
                max_attempts: assess.max_attempts || 3,
                shuffle_questions: assess.shuffle_questions || false,
                shuffle_options: assess.shuffle_options || false,
                show_correct_answers: assess.show_correct_answers || 'never'
              });
              setQuestions(assess.questions || []);
            }
          } catch (assessErr) {
            // Assessment might not exist yet, which is fine
          }
        } catch (err) {
          toast.error('Failed to load course details');
          navigate('/admin/courses');
        } finally {
          setLoading(false);
        }
      };

      loadCourseData();
    }
  }, [id, isEditMode, navigate]);

  // Step 1: Save Course Info
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!courseInfo.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    try {
      setLoading(true);
      let courseId = id;
      if (isEditMode) {
        await coursesAPI.update(id, courseInfo);
        toast.success('Course information updated!');
      } else {
        const res = await coursesAPI.create(courseInfo);
        courseId = res.data.id;
        toast.success('Course created! Redirecting to builder...');
        navigate(`/admin/courses/${courseId}/edit`, { replace: true });
      }

      // Upload thumbnail if selected
      if (thumbnailFile && courseId) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        const thumbRes = await coursesAPI.uploadThumbnail(courseId, formData);
        setThumbnailPreview(`http://10.18.138.234:8000${thumbRes.data.thumbnail_url}`);
        setThumbnailFile(null);
        toast.success('Thumbnail uploaded!');
      }

      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save course info');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Add Module
  const handleAddModule = async () => {
    if (!newModule.title.trim()) {
      toast.error('Module title is required');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', newModule.title);
      formData.append('content_type', newModule.content_type);
      formData.append('order_index', (modules.length + 1).toString());

      if (newModule.content_type === 'text') {
        formData.append('content_text', newModule.content_text);
      } else if (newModule.content_type === 'url') {
        formData.append('external_url', newModule.external_url);
      } else if (newModule.content_type === 'file' && moduleFile) {
        formData.append('file', moduleFile);
      }

      const res = await coursesAPI.addModule(id, formData);
      setModules([...modules, res.data]);
      setNewModule({
        title: '',
        content_type: 'text',
        content_text: '',
        external_url: '',
        order_index: 0
      });
      setModuleFile(null);
      setShowAddModule(false);
      toast.success('Module added successfully!');
    } catch (err) {
      toast.error('Failed to add module');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Delete Module
  const handleDeleteModule = async (mid) => {
    if (!window.confirm('Delete this module?')) return;
    try {
      setLoading(true);
      await coursesAPI.deleteModule(id, mid);
      setModules(modules.filter((m) => m.id !== mid));
      toast.success('Module deleted successfully');
    } catch (err) {
      toast.error('Failed to delete module');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Question management
  const handleAddQuestion = () => {
    const newQ = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_type: 'mcq', // 'mcq', 'true_false', 'multi_select'
      marks: 1,
      order_index: questions.length + 1,
      options: [
        { option_text: 'Option 1', is_correct: true },
        { option_text: 'Option 2', is_correct: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (qId, field, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const updated = { ...q, [field]: value };
          // If type changes to true_false, reset options
          if (field === 'question_type' && value === 'true_false') {
            updated.options = [
              { option_text: 'True', is_correct: true },
              { option_text: 'False', is_correct: false }
            ];
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (qId) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleAddOption = (qId) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: [...q.options, { option_text: `Option ${q.options.length + 1}`, is_correct: false }]
          };
        }
        return q;
      })
    );
  };

  const handleUpdateOption = (qId, optIdx, field, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOptions = q.options.map((opt, idx) => {
            if (idx === optIdx) {
              return { ...opt, [field]: value };
            }
            // For MCQ/True-False, only one can be correct
            if (field === 'is_correct' && value === true && (q.question_type === 'mcq' || q.question_type === 'true_false')) {
              return { ...opt, is_correct: false };
            }
            return opt;
          });
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleDeleteOption = (qId, optIdx) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return { ...q, options: q.options.filter((_, idx) => idx !== optIdx) };
        }
        return q;
      })
    );
  };

  // Step 3: Save Assessment
  const handleSaveAssessment = async () => {
    // Basic validation
    if (questions.length === 0) {
      toast.error('Please add at least one question to the assessment');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        toast.error(`Question ${i + 1} has no text`);
        return;
      }
      const hasCorrect = q.options.some((opt) => opt.is_correct);
      if (!hasCorrect) {
        toast.error(`Question "${q.question_text.substring(0, 20)}..." has no correct answer marked`);
        return;
      }
    }

    try {
      setLoading(true);
      // Strip temporary IDs
      const cleanQuestions = questions.map((q, idx) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        order_index: idx + 1,
        marks: q.marks,
        explanation: q.explanation || '',
        options: q.options.map((opt) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct
        }))
      }));

      const payload = {
        ...assessmentSettings,
        course_id: parseInt(id),
        questions: cleanQuestions
      };

      if (hasAssessment) {
        await assessmentsAPI.update(assessmentId, payload);
        toast.success('Assessment settings updated!');
      } else {
        const res = await assessmentsAPI.create(payload);
        setAssessmentId(res.data.id);
        setHasAssessment(true);
        toast.success('Assessment created successfully!');
      }

      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Final Publish
  const handleFinalPublish = async (publish) => {
    try {
      setLoading(true);
      const updatedInfo = { ...courseInfo, is_published: publish };
      await coursesAPI.update(id, updatedInfo);
      setCourseInfo(updatedInfo);
      toast.success(publish ? 'Course published successfully!' : 'Course draft saved successfully.');
      navigate('/admin/courses');
    } catch (err) {
      toast.error('Failed to finalize course status');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Engineering', 'Product', 'Compliance', 'Sales', 'Marketing', 'Design', 'Other'];

  if (loading && step === 1) return <Spinner />;

  return (
    <div id="course-builder-container" className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Back to List */}
      <button
        id="builder-back-to-list-btn"
        onClick={() => navigate('/admin/courses')}
        className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </button>

      {/* Step Indicator */}
      <div className="glass-card p-5 border border-dark-850 flex justify-between items-center">
        {[
          { num: 1, label: 'Course Info', icon: BookOpen },
          { num: 2, label: 'Modules', icon: Layers },
          { num: 3, label: 'Assessment', icon: Award },
          { num: 4, label: 'Review & Publish', icon: Check }
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border transition-all duration-300 ${step === s.num
                    ? 'bg-primary-600/20 border-primary-500 text-primary-400 shadow-md shadow-primary-500/10 scale-105'
                    : step > s.num
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-dark-900 border-dark-750 text-dark-500'
                  }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className={`hidden md:inline text-xs font-semibold ${step === s.num ? 'text-primary-400' : 'text-dark-400'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: COURSE INFO */}
      {step === 1 && (
        <form onSubmit={handleSaveInfo} className="glass-card p-6 border border-dark-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-400" />
            Course Specifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Course Title</label>
              <input
                id="builder-title-input"
                type="text"
                placeholder="e.g., Introduction to Cloud Architecture"
                value={courseInfo.title}
                onChange={(e) => setCourseInfo({ ...courseInfo, title: e.target.value })}
                className="input-field"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Description</label>
              <textarea
                id="builder-desc-input"
                placeholder="Course syllabus, target audience, and objectives..."
                value={courseInfo.description}
                onChange={(e) => setCourseInfo({ ...courseInfo, description: e.target.value })}
                className="input-field min-h-24 resize-y"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Category</label>
              <select
                id="builder-category-select"
                value={courseInfo.category}
                onChange={(e) => setCourseInfo({ ...courseInfo, category: e.target.value })}
                className="input-field"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Course Type</label>
              <select
                id="builder-type-select"
                value={courseInfo.course_type}
                onChange={(e) => setCourseInfo({ ...courseInfo, course_type: e.target.value })}
                className="input-field"
              >
                <option value="assigned">Assigned Training (Mandatory)</option>
                <option value="free">Free Catalog (Self-enroll)</option>
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Estimated Duration (mins)</label>
              <input
                id="builder-duration-input"
                type="number"
                min={5}
                value={courseInfo.duration_minutes}
                onChange={(e) => setCourseInfo({ ...courseInfo, duration_minutes: parseInt(e.target.value) || 0 })}
                className="input-field"
                required
              />
            </div>

            {/* Thumbnail upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Thumbnail Image</label>
              <div className="flex items-center gap-4">
                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="w-14 h-14 rounded-xl object-cover border border-dark-700 bg-dark-900"
                  />
                )}
                <div className="flex-1 relative">
                  <input
                    id="builder-thumbnail-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setThumbnailFile(file);
                        setThumbnailPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="builder-thumbnail-file"
                    className="flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-xs text-dark-200 cursor-pointer font-medium transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Select Image
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-4">
            <button
              id="builder-step1-submit-btn"
              type="submit"
              className="btn-primary flex items-center gap-2"
            >
              Configure Modules
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: MODULES */}
      {step === 2 && (
        <div className="glass-card p-6 border border-dark-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-400" />
              Course Curriculum
            </h2>
            <button
              id="builder-add-module-toggle-btn"
              onClick={() => setShowAddModule(!showAddModule)}
              className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2"
            >
              {showAddModule ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddModule ? 'Cancel' : 'Add Module'}
            </button>
          </div>

          {/* Add Module Box */}
          {showAddModule && (
            <div className="bg-dark-900 border border-dark-750/70 p-5 rounded-2xl space-y-4 animate-slide-down">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Module Title</label>
                <input
                  id="builder-module-title-input"
                  type="text"
                  placeholder="e.g., Chapter 1: Cloud Basics"
                  value={newModule.title}
                  onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                  className="input-field text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2 bg-dark-950 p-1.5 rounded-xl border border-dark-800">
                {[
                  { type: 'text', label: 'Rich Text', icon: FileText },
                  { type: 'file', label: 'PDF / File', icon: Upload },
                  { type: 'url', label: 'Video / URL', icon: Video }
                ].map((mt) => {
                  const Icon = mt.icon;
                  return (
                    <button
                      key={mt.type}
                      type="button"
                      onClick={() => setNewModule({ ...newModule, content_type: mt.type })}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${newModule.content_type === mt.type
                          ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                          : 'text-dark-400 hover:text-dark-200'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {mt.label}
                    </button>
                  );
                })}
              </div>

              {newModule.content_type === 'text' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Content Text</label>
                  <textarea
                    id="builder-module-text-input"
                    placeholder="Enter module information details..."
                    value={newModule.content_text}
                    onChange={(e) => setNewModule({ ...newModule, content_text: e.target.value })}
                    className="input-field text-sm min-h-24"
                  />
                </div>
              )}

              {newModule.content_type === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">External URL</label>
                  <input
                    id="builder-module-url-input"
                    type="url"
                    placeholder="e.g., https://youtube.com/embed/..."
                    value={newModule.external_url}
                    onChange={(e) => setNewModule({ ...newModule, external_url: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              )}

              {newModule.content_type === 'file' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Upload File (PDF)</label>
                  <input
                    id="builder-module-file-input"
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setModuleFile(e.target.files[0])}
                    className="input-field text-sm"
                  />
                </div>
              )}

              <button
                id="builder-module-save-btn"
                type="button"
                onClick={handleAddModule}
                className="btn-primary w-full text-sm"
              >
                Save Module
              </button>
            </div>
          )}

          {/* Module List */}
          {modules.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-dark-850 rounded-2xl text-center text-dark-500">
              No modules added yet. Add training curriculum files or pages.
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-dark-900 border border-dark-800/80 rounded-xl p-4 flex items-center justify-between group hover:border-dark-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-850 flex items-center justify-center text-dark-400 font-semibold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">
                          {m.content_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`builder-module-delete-${m.id}`}
                      onClick={() => handleDeleteModule(m.id)}
                      className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Module"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-dark-800/60">
            <button
              id="builder-step2-prev-btn"
              onClick={() => setStep(1)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              id="builder-step2-next-btn"
              onClick={() => setStep(3)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              Configure Assessment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ASSESSMENT */}
      {step === 3 && (
        <div className="glass-card p-6 border border-dark-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-400" />
            Course Assessment Setup
          </h2>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-dark-900/40 p-4 border border-dark-800/60 rounded-2xl">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Passing Percentage (%)</label>
              <input
                id="assessment-pass-percent"
                type="number"
                min={10}
                max={100}
                value={assessmentSettings.pass_percentage}
                onChange={(e) => setAssessmentSettings({ ...assessmentSettings, pass_percentage: parseInt(e.target.value) || 0 })}
                className="input-field text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Time Limit (minutes)</label>
              <input
                id="assessment-time-limit"
                type="number"
                min={0}
                placeholder="No limit"
                value={assessmentSettings.time_limit_minutes || ''}
                onChange={(e) => setAssessmentSettings({ ...assessmentSettings, time_limit_minutes: parseInt(e.target.value) || null })}
                className="input-field text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Max Attempts Allowed</label>
              <input
                id="assessment-max-attempts"
                type="number"
                min={1}
                value={assessmentSettings.max_attempts}
                onChange={(e) => setAssessmentSettings({ ...assessmentSettings, max_attempts: parseInt(e.target.value) || 1 })}
                className="input-field text-sm"
              />
            </div>

            <div className="flex items-center gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-dark-200">
                <input
                  type="checkbox"
                  checked={assessmentSettings.shuffle_questions}
                  onChange={(e) => setAssessmentSettings({ ...assessmentSettings, shuffle_questions: e.target.checked })}
                  className="rounded bg-dark-800 border-dark-600 text-primary-500 focus:ring-0"
                />
                Shuffle Questions
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-dark-200">
                <input
                  type="checkbox"
                  checked={assessmentSettings.shuffle_options}
                  onChange={(e) => setAssessmentSettings({ ...assessmentSettings, shuffle_options: e.target.checked })}
                  className="rounded bg-dark-800 border-dark-600 text-primary-500 focus:ring-0"
                />
                Shuffle Options
              </label>
            </div>
          </div>

          {/* Question Builder */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Questions ({questions.length})</h3>
              <button
                id="assessment-add-question-btn"
                type="button"
                onClick={handleAddQuestion}
                className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4 text-primary-400" />
                Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="bg-dark-900 border border-dark-800/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-xs text-primary-400 uppercase">Q{qIdx + 1}</span>
                    <button
                      id={`assessment-question-delete-${q.id}`}
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      id={`assessment-question-text-${q.id}`}
                      type="text"
                      placeholder="Write your question..."
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestion(q.id, 'question_text', e.target.value)}
                      className="input-field text-sm md:col-span-2"
                    />
                    <select
                      id={`assessment-question-type-${q.id}`}
                      value={q.question_type}
                      onChange={(e) => handleUpdateQuestion(q.id, 'question_type', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="mcq">Single Choice (MCQ)</option>
                      <option value="multi_select">Multi-Select Checkboxes</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pl-4 border-l border-dark-750">
                    <p className="text-xs font-semibold text-dark-400">Options:</p>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-3">
                        <input
                          type={q.question_type === 'multi_select' ? 'checkbox' : 'radio'}
                          checked={opt.is_correct}
                          onChange={(e) => handleUpdateOption(q.id, optIdx, 'is_correct', e.target.checked)}
                          name={`q-${q.id}-correct`}
                          className="bg-dark-850 border-dark-650 text-emerald-500 focus:ring-0 w-4.5 h-4.5"
                        />
                        <input
                          id={`assessment-option-text-${q.id}-${optIdx}`}
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => handleUpdateOption(q.id, optIdx, 'option_text', e.target.value)}
                          className="bg-dark-950 border border-dark-750 rounded-lg py-1.5 px-3 text-xs text-dark-100 flex-1 focus:ring-1 focus:ring-primary-500/50"
                        />
                        {q.question_type !== 'true_false' && q.options.length > 2 && (
                          <button
                            id={`assessment-option-delete-${q.id}-${optIdx}`}
                            onClick={() => handleDeleteOption(q.id, optIdx)}
                            className="p-1 text-dark-500 hover:text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {q.question_type !== 'true_false' && (
                      <button
                        id={`assessment-option-add-${q.id}`}
                        type="button"
                        onClick={() => handleAddOption(q.id)}
                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Option
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-dark-800/60">
            <button
              id="builder-step3-prev-btn"
              onClick={() => setStep(2)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              id="builder-step3-save-btn"
              onClick={handleSaveAssessment}
              className="btn-primary text-sm flex items-center gap-2"
            >
              Review & Finalize
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & PUBLISH */}
      {step === 4 && (
        <div className="glass-card p-6 border border-dark-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            Review Course & Publish
          </h2>

          <div className="divide-y divide-dark-800 space-y-4">
            <div className="pt-2">
              <span className="text-xs font-semibold text-dark-400 uppercase block">Course Summary</span>
              <h3 className="text-lg font-bold text-white mt-1">{courseInfo.title}</h3>
              <p className="text-dark-300 text-sm mt-1 leading-relaxed">{courseInfo.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="badge badge-primary">{courseInfo.category}</span>
                <span className="badge bg-dark-800 text-dark-300 capitalize">{courseInfo.course_type}</span>
                <span className="badge bg-dark-800 text-dark-300">{courseInfo.duration_minutes} minutes</span>
              </div>
            </div>

            <div className="pt-4">
              <span className="text-xs font-semibold text-dark-400 uppercase block">Curriculum</span>
              <p className="text-sm font-semibold text-white mt-1">{modules.length} Modules added</p>
              <div className="mt-2 text-xs text-dark-400">
                {modules.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 py-1">
                    <span>{i + 1}.</span>
                    <span>{m.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <span className="text-xs font-semibold text-dark-400 uppercase block">Assessment settings</span>
              <p className="text-sm font-semibold text-white mt-1">
                {assessmentSettings.title} ({questions.length} questions)
              </p>
              <p className="text-xs text-dark-400 mt-0.5">
                Pass mark: {assessmentSettings.pass_percentage}% | Max attempts: {assessmentSettings.max_attempts}
              </p>
            </div>
          </div>

          {/* Final Action buttons */}
          <div className="flex justify-between pt-6 border-t border-dark-800/60">
            <button
              id="builder-step4-prev-btn"
              onClick={() => setStep(3)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                id="builder-save-draft-btn"
                onClick={() => handleFinalPublish(false)}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                id="builder-publish-course-btn"
                onClick={() => handleFinalPublish(true)}
                className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/25 hover:from-emerald-500 hover:to-emerald-400"
              >
                Publish Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
