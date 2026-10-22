import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  Trash2, 
  AlertTriangle, 
  ArrowLeft, 
  Plus, 
  Cpu
} from 'lucide-react';
import { Task, TaskCategory } from '../types';
import { ParsedTaskCandidate } from '../utils/importParser';
import { parseTasksWithFallback } from '../utils/importService';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTasks: (tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>[]) => void;
  now?: Date;
}

const SAMPLE_SYLLABUS = `CS 350 - Operating Systems: Lab 3 (Virtual Memory) due Oct 28 at 11:59 PM (~4h effort).
MATH 220: Problem Set 5 due next Tuesday by midnight.
BIO 112: Read Chapter 6 on Cell Division before tomorrow.
ECON 201: Midterm Exam on Nov 15 at 2:00 PM (study ~6 hours).`;

const SAMPLE_ANNOUNCEMENT = `Hi everyone, quick reminder about upcoming deadlines:
- CS 101 Homework 4 due Friday 11:59pm (~2.5h)
- Quiz 3 on Monday at 9:00 AM
- Final Term Project Proposal due 11/12`;

const SAMPLE_CHAT = `hey guys dont forget the phys 202 lab report due tomorrow at 5pm! also calc homework due wednesday midnight`;

export const ImportTasksModal: React.FC<ImportTasksModalProps> = ({
  isOpen,
  onClose,
  onImportTasks,
  now = new Date(),
}) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [candidates, setCandidates] = useState<ParsedTaskCandidate[]>([]);
  const [parserSource, setParserSource] = useState<'gemini' | 'rule-based'>('rule-based');
  const [parseNotice, setParseNotice] = useState<string>('');

  // ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setRawText('');
      setCandidates([]);
      setIsParsing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseTasksWithFallback(rawText, now);
      setCandidates(result.tasks);
      setParserSource(result.source);
      setParseNotice(result.notice || '');
      setStep('review');
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const handleFieldChange = (id: string, field: keyof ParsedTaskCandidate, value: any) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConfirmImport = () => {
    const selected = candidates.filter((c) => c.selected);
    const toImport = selected.map((c) => ({
      title: c.title.trim() || 'Imported Task',
      course: c.course.trim().toUpperCase() || 'GENERAL',
      dueDateTime: c.dueDateTime,
      estimatedHours: Math.max(0.25, Number(c.estimatedHours) || 2),
      priority: c.priority,
      category: c.category,
      notes: c.notes ? `${c.notes}\n// Imported via Paste-to-Import` : '// Imported via Paste-to-Import',
    }));

    onImportTasks(toImport);
    onClose();
  };

  const selectedCount = candidates.filter((c) => c.selected).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-[#111111] border border-orange-500/40 text-white font-mono shadow-[0_0_50px_rgba(249,115,22,0.15)] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs uppercase tracking-widest font-bold">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>PASTE-TO-IMPORT // COURSEWORK INTAKE</span>
            </div>
            <h2 id="import-modal-title" className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
              {step === 'input' ? 'Paste Syllabus or Announcement' : 'Review & Confirm Coursework'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {step === 'input'
                ? 'Drop in raw text from Canvas, an instructor email, or a study group. We will extract deadlines, courses, and estimates.'
                : 'Review detected assignments, correct ambiguous dates, and deselect anything you do not want to track.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Sample Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] uppercase text-zinc-500 font-bold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_SYLLABUS)}
                className="px-2.5 py-1 border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-[11px] transition-colors cursor-pointer"
              >
                Syllabus Snippet
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_ANNOUNCEMENT)}
                className="px-2.5 py-1 border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-[11px] transition-colors cursor-pointer"
              >
                Canvas Announcement
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_CHAT)}
                className="px-2.5 py-1 border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-[11px] transition-colors cursor-pointer"
              >
                Group Chat Notes
              </button>
            </div>

            {/* Main Textarea */}
            <div className="space-y-1">
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste coursework text here (e.g. CS 350 Lab 3 due Friday at 11:59 PM...)"
                className="w-full p-4 bg-black border border-white/20 text-white font-mono text-xs focus:border-orange-500 focus:outline-none leading-relaxed resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Supports multiple lines, dates, course codes, and effort estimates.</span>
                <span>{rawText.length} characters</span>
              </div>
            </div>

            {/* Privacy & Fallback Notice */}
            <div className="p-3 border border-white/10 bg-black/40 flex items-start space-x-2 text-xs text-zinc-400">
              <Cpu className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase text-zinc-300 font-bold block">
                  HYBRID ENGINE ARCHITECTURE:
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Processes using an offline rule-based parser by default. If a Vercel serverless Gemini API key is configured, uses server-side AI parsing and falls back locally with zero data loss.
                </p>
              </div>
            </div>

            {/* Parse Action */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rawText.trim() || isParsing}
                onClick={handleParse}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase text-xs tracking-widest transition-colors cursor-pointer flex items-center space-x-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                {isParsing ? (
                  <span>Parsing Telemetry...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Parse Coursework</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW TABLE */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Telemetry Summary & Engine Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-white/10 bg-black/50 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 text-[11px] uppercase">PARSER ENGINE:</span>
                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                  parserSource === 'gemini'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                }`}>
                  {parserSource === 'gemini' ? '✦ Gemini AI (Serverless)' : '⚙️ Rule-Based Engine (Offline)'}
                </span>
                {parseNotice && <span className="text-zinc-500 text-[10px]">({parseNotice})</span>}
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-orange-400 hover:text-white text-[11px] underline underline-offset-2 cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-600">/</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-zinc-400 hover:text-white text-[11px] underline underline-offset-2 cursor-pointer"
                >
                  Deselect All
                </button>
                <span className="text-zinc-300 font-bold ml-2">
                  [{selectedCount} / {candidates.length} Selected]
                </span>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center space-y-3 border border-white/10 bg-zinc-950">
                <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto" />
                <h3 className="font-display text-xl text-white uppercase">No Assignments Detected</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  We could not detect clear deadlines or coursework in the pasted text. Try pasting specific lines with dates, course codes, or assignment titles.
                </p>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase font-bold cursor-pointer"
                >
                  &larr; Back to Text Input
                </button>
              </div>
            ) : (
              /* Candidate Review Rows */
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {candidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className={`p-3.5 border transition-all space-y-3 ${
                      candidate.selected
                        ? 'border-white/20 bg-zinc-950'
                        : 'border-white/5 bg-black/40 opacity-60'
                    }`}
                  >
                    {/* Top Row: Checkbox, Course, Title, Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={candidate.selected}
                          onChange={() => handleToggleSelect(candidate.id)}
                          aria-label={`Select ${candidate.title}`}
                          className="w-4 h-4 accent-orange-500 rounded-none cursor-pointer"
                        />
                        <span className="text-zinc-500 text-xs font-bold">[{idx + 1}]</span>

                        {/* Course Code Input */}
                        <input
                          type="text"
                          value={candidate.course}
                          onChange={(e) => handleFieldChange(candidate.id, 'course', e.target.value.toUpperCase())}
                          placeholder="COURSE"
                          className="w-24 p-1.5 bg-black border border-white/20 text-orange-400 font-bold uppercase text-xs text-center focus:border-orange-500 focus:outline-none"
                        />

                        {/* Title Input */}
                        <input
                          type="text"
                          value={candidate.title}
                          onChange={(e) => handleFieldChange(candidate.id, 'title', e.target.value)}
                          placeholder="Assignment Title"
                          className="flex-1 p-1.5 bg-black border border-white/20 text-white font-bold text-xs uppercase focus:border-orange-500 focus:outline-none min-w-[150px]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        aria-label="Remove item"
                        className="p-1.5 border border-transparent hover:border-red-500/40 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle Row: Due Date, Category, Priority, Effort */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1">
                      {/* Due Date Input */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block">
                          DEADLINE:
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="datetime-local"
                            value={candidate.dueDateTime.slice(0, 16)}
                            onChange={(e) =>
                              handleFieldChange(candidate.id, 'dueDateTime', new Date(e.target.value).toISOString())
                            }
                            className="w-full p-1.5 bg-black border border-white/20 text-zinc-200 text-xs focus:border-orange-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block">
                          CATEGORY:
                        </label>
                        <select
                          value={candidate.category}
                          onChange={(e) => handleFieldChange(candidate.id, 'category', e.target.value as TaskCategory)}
                          className="w-full p-1.5 bg-black border border-white/20 text-zinc-200 text-xs focus:border-orange-500 focus:outline-none capitalize"
                        >
                          <option value="assignment">Assignment</option>
                          <option value="lab">Lab</option>
                          <option value="project">Project</option>
                          <option value="reading">Reading</option>
                          <option value="quiz">Quiz</option>
                          <option value="exam">Exam</option>
                        </select>
                      </div>

                      {/* Effort (Hours) */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block">
                          EST. HOURS:
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.25"
                          max="50"
                          value={candidate.estimatedHours}
                          onChange={(e) => handleFieldChange(candidate.id, 'estimatedHours', parseFloat(e.target.value) || 1)}
                          className="w-full p-1.5 bg-black border border-white/20 text-orange-400 font-bold text-xs text-center focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Ambiguous Date Flag Pill */}
                    {candidate.isDateAmbiguous && (
                      <div className="p-2 border border-amber-500/30 bg-amber-950/20 text-[11px] text-amber-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>
                          <strong>Ambiguous date flagged:</strong> {candidate.ambiguityReason || 'Please verify the deadline date & time.'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Raw Text</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase text-xs tracking-widest transition-colors cursor-pointer flex items-center space-x-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Import {selectedCount} Selected Task{selectedCount === 1 ? '' : 's'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
