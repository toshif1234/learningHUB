import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assessmentsAPI } from "../../api/assessments";
import { toast } from "react-hot-toast";
import {
  Award,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Square,
  Check,
} from "lucide-react";
import Spinner from "../../components/Spinner";
import Modal from "../../components/Modal";

export default function AssessmentPage() {
  const { id } = useParams(); // Assessment ID
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQIdx, setActiveQIdx] = useState(0);

  // Answers dict: { [questionId]: [selectedOptionIds] }
  const [answers, setAnswers] = useState({});

  // Timer state
  const [timeLimit, setTimeLimit] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const timerIntervalRef = useRef(null);

  // Start Quiz (unchanged except minor safety)
  useEffect(() => {
    const startQuiz = async () => {
      try {
        setLoading(true);
        const res = await assessmentsAPI.start(id);
        const data = res.data;

        setAttemptId(data.attempt_id);
        setQuestions(data.questions || []);
        setTimeLimit(data.time_limit_minutes);

        if (data.time_limit_minutes) {
          const startedAt = new Date(data.started_at);
          const deadlineTime =
            startedAt.getTime() + data.time_limit_minutes * 60 * 1000;
          const diffSeconds = Math.max(
            0,
            Math.floor((deadlineTime - Date.now()) / 1000),
          );

          setSecondsLeft(diffSeconds);
        }
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to start assessment");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    startQuiz();
  }, [id, navigate]);
  const handleAutoSubmit = async () => {
    toast.error("Time is up! Submitting assessment automatically...");
    await performSubmit();
  };

  const performSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = buildSubmissionPayload();
      await assessmentsAPI.submit(attemptId, payload);
      toast.success("Assessment submitted successfully!");
      navigate(`/my/results/${attemptId}`, { replace: true });
    } catch (err) {
      toast.error("Failed to submit assessment answers");
    } finally {
      setSubmitting(false);
    }
  };
  // === FIXED TIMER EFFECT ===
  useEffect(() => {
    if (!timeLimit || secondsLeft <= 0 || loading || submitting) {
      return;
    }

    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeLimit, loading, submitting]); // Removed secondsLeft from deps!

  const handleSelectOption = (questionId, optionId, type) => {
    setAnswers((prev) => {
      const selected = prev[questionId] || [];
      if (type === "multi_select") {
        const updated = selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
        return { ...prev, [questionId]: updated };
      } else {
        // MCQ or true_false (single choice)
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const buildSubmissionPayload = () => {
    return {
      answers: Object.keys(answers).map((qId) => ({
        question_id: parseInt(qId),
        selected_option_ids: answers[qId],
      })),
    };
  };

  const handleSubmitClick = () => {
    setConfirmOpen(true);
  };

  if (loading) return <Spinner />;
  if (questions.length === 0) return null;

  const activeQuestion = questions[activeQIdx];
  const activeAnswers = answers[activeQuestion.id] || [];

  return (
    <div
      id="assessment-page-container"
      className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-12"
    >
      {/* Top Bar: Progress and Timer */}
      <div className="glass-card p-5 border border-dark-800 flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-widest">
            Ongoing Assessment
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            Question {activeQIdx + 1} of {questions.length}
          </h2>
        </div>

        {timeLimit && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm ${
              secondsLeft < 120
                ? "bg-rose-500/10 border-rose-500/35 text-rose-400 animate-pulse-slow"
                : "bg-dark-900 border-dark-800 text-primary-400"
            }`}
          >
            <Clock className="w-4.5 h-4.5" />
            <span>{formatTime(secondsLeft)}</span>
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 glass-card p-4 border border-dark-800 h-fit space-y-4">
          <h3 className="font-bold text-xs text-dark-400 uppercase tracking-widest text-center">
            Navigation
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
            {questions.map((_, idx) => {
              const qId = questions[idx].id;
              const hasAnswered = answers[qId] && answers[qId].length > 0;
              const isActive = idx === activeQIdx;

              return (
                <button
                  key={idx}
                  id={`nav-question-${idx}`}
                  onClick={() => setActiveQIdx(idx)}
                  className={`h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-all ${
                    isActive
                      ? "bg-primary-600/20 border-primary-500 text-primary-400"
                      : hasAnswered
                        ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                        : "bg-dark-900 border-dark-800 text-dark-400 hover:text-dark-200"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Panel */}
        <div className="md:col-span-3 glass-card p-6 border border-dark-800 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="badge badge-primary uppercase text-[9px] font-bold tracking-wide">
                  {activeQuestion.question_type.replace("_", " ")}
                </span>
                <span className="text-xs text-dark-500 font-semibold">
                  {activeQuestion.marks} Mark(s)
                </span>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white leading-relaxed">
                {activeQuestion.question_text}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {activeQuestion.options.map((opt) => {
                const isSelected = activeAnswers.includes(opt.id);
                const isMulti = activeQuestion.question_type === "multi_select";

                return (
                  <div
                    key={opt.id}
                    onClick={() =>
                      handleSelectOption(
                        activeQuestion.id,
                        opt.id,
                        activeQuestion.question_type,
                      )
                    }
                    className={`flex items-center gap-3.5 p-4 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-primary-500/10 border-primary-500 text-white"
                        : "bg-dark-900 border-dark-800/80 text-dark-300 hover:border-dark-700/60 hover:bg-dark-850/20"
                    }`}
                  >
                    <div className="flex-shrink-0 text-primary-400">
                      {isMulti ? (
                        isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-primary-500 bg-primary-500/20" : "border-dark-600"}`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium leading-relaxed">
                      {opt.option_text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center border-t border-dark-800 pt-5 mt-6">
            <button
              id="assessment-prev-btn"
              onClick={() => setActiveQIdx((i) => Math.max(0, i - 1))}
              disabled={activeQIdx === 0}
              className="btn-secondary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {activeQIdx < questions.length - 1 ? (
              <button
                id="assessment-next-btn"
                onClick={() =>
                  setActiveQIdx((i) => Math.min(questions.length - 1, i + 1))
                }
                className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="assessment-submit-click-btn"
                onClick={handleSubmitClick}
                className="btn-primary py-2 px-6 text-xs flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
              >
                Submit Exam
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit Assessment?"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="confirm-submit-cancel"
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="confirm-submit-ok"
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                performSubmit();
              }}
              disabled={submitting}
              className="btn-primary py-2 px-5 text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
            >
              {submitting ? "Submitting..." : "Yes, Submit"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-dark-300">
            Are you sure you want to submit your answers? Please verify that you
            have answered all questions.
          </p>
          <div className="p-3 bg-dark-900 border border-dark-800 rounded-xl text-xs space-y-1.5 text-dark-400">
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="font-bold text-white">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Questions Answered:</span>
              <span className="font-bold text-white">
                {Object.values(answers).filter((a) => a.length > 0).length}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
