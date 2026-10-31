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
import { Modal } from './ui/Modal';

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

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setRawText('');
      setCandidates([]);
      setIsParsing(false);
    }
  }, [isOpen]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      title="Paste deadlines"
    >
      <div className="p-6 sm:p-7 space-y-6 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>Import coursework</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              {step === 'input' ? 'Paste syllabus or announcement' : 'Review & confirm tasks'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {step === 'input'
                ? 'Drop in text from Canvas, an instructor email, or a study group chat to extract deadlines and effort.'
                : 'Review detected assignments, correct dates, and choose what you want to add.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Sample Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-zinc-500 font-medium">Examples:</span>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_SYLLABUS)}
                className="px-2.5 py-1 rounded-lg border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-xs transition-colors cursor-pointer"
              >
                Syllabus
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_ANNOUNCEMENT)}
                className="px-2.5 py-1 rounded-lg border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-xs transition-colors cursor-pointer"
              >
                Announcement
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_CHAT)}
                className="px-2.5 py-1 rounded-lg border border-white/15 bg-black/40 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 text-xs transition-colors cursor-pointer"
              >
                Study group chat
              </button>
            </div>

            {/* Main Textarea */}
            <div className="space-y-1">
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste assignment text here (e.g. CS 350 Lab 3 due Friday at 11:59 PM...)"
                className="w-full p-4 rounded-xl bg-black border border-white/15 text-white font-mono text-xs focus:border-orange-500 focus:outline-none leading-relaxed resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Understands multi-line schedules, dates, and courses</span>
                <span>{rawText.length} characters</span>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="p-3 rounded-lg border border-white/10 bg-black/40 flex items-start space-x-2.5 text-xs text-zinc-400">
              <Cpu className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Processed locally by default. When connected, uses serverless AI parsing with automatic offline fallback.
              </p>
            </div>

            {/* Parse Action */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rawText.trim() || isParsing}
                onClick={handleParse}
                className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center space-x-2"
              >
                {isParsing ? (
                  <span>Parsing text...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Find deadlines</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW TABLE */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Header Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-white/10 bg-black/50 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 text-xs">Source:</span>
                <span className={`px-2 py-0.5 text-[11px] rounded font-medium border ${
                  parserSource === 'gemini'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                }`}>
                  {parserSource === 'gemini' ? '✦ AI' : '⚙ Offline rules'}
                </span>
                {parseNotice && <span className="text-zinc-500 text-[11px]">({parseNotice})</span>}
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-orange-400 hover:text-white underline cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-zinc-600">/</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Deselect all
                </button>
                <span className="text-zinc-300 font-medium ml-2">
                  {selectedCount} of {candidates.length} selected
                </span>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center space-y-3 rounded-xl border border-white/10 bg-zinc-950">
                <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto" />
                <h3 className="text-base font-semibold text-white">No assignments detected</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  We could not detect clear deadlines in the pasted text. Try pasting lines that include dates or assignment names.
                </p>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer"
                >
                  &larr; Back to text
                </button>
              </div>
            ) : (
              /* Candidate Review Rows */
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {candidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-3 ${
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
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                        />
                        <span className="text-zinc-500 text-xs font-mono">{idx + 1}.</span>

                        {/* Course Code Input */}
                        <input
                          type="text"
                          value={candidate.course}
                          onChange={(e) => handleFieldChange(candidate.id, 'course', e.target.value.toUpperCase())}
                          placeholder="Course"
                          className="w-24 p-1.5 rounded bg-black border border-white/20 text-orange-400 font-semibold uppercase text-xs text-center focus:border-orange-500 focus:outline-none"
                        />

                        {/* Title Input */}
                        <input
                          type="text"
                          value={candidate.title}
                          onChange={(e) => handleFieldChange(candidate.id, 'title', e.target.value)}
                          placeholder="Assignment Title"
                          className="flex-1 p-1.5 rounded bg-black border border-white/20 text-white font-medium text-xs focus:border-orange-500 focus:outline-none min-w-[150px]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        aria-label="Remove item"
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle Row: Due Date, Category, Priority, Effort */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1">
                      {/* Due Date */}
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Deadline</label>
                        <input
                          type="datetime-local"
                          value={candidate.dueDateTime ? candidate.dueDateTime.slice(0, 16) : ''}
                          onChange={(e) => handleFieldChange(candidate.id, 'dueDateTime', e.target.value)}
                          className="w-full p-1.5 rounded bg-black border border-white/15 text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Effort Hours - tap to cycle */}
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Est. Hours</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cycle = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
                            const cur = Number(candidate.estimatedHours) || 2;
                            const idx = cycle.indexOf(cur);
                            const next = idx >= 0 ? cycle[(idx + 1) % cycle.length] : 2;
                            handleFieldChange(candidate.id, 'estimatedHours', next);
                          }}
                          title="Tap to cycle estimated hours"
                          className="w-full text-left p-1.5 rounded bg-black/60 border border-white/10 hover:border-white/30 text-white text-xs font-mono border-b border-b-white/40 border-b-dotted flex items-center justify-between cursor-pointer min-h-[34px]"
                        >
                          <span>{candidate.estimatedHours}h</span>
                          <span className="text-[10px] text-zinc-500 font-sans">tap to cycle</span>
                        </button>
                      </div>

                      {/* Category - tap to cycle */}
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Category</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cycle: TaskCategory[] = ['assignment', 'lab', 'project', 'quiz', 'exam', 'reading', 'other'];
                            const idx = cycle.indexOf(candidate.category);
                            const next = idx >= 0 ? cycle[(idx + 1) % cycle.length] : 'assignment';
                            handleFieldChange(candidate.id, 'category', next);
                          }}
                          title="Tap to cycle category"
                          className="w-full text-left p-1.5 rounded bg-black/60 border border-white/10 hover:border-white/30 text-white text-xs capitalize border-b border-b-white/40 border-b-dotted flex items-center justify-between cursor-pointer min-h-[34px]"
                        >
                          <span>{candidate.category}</span>
                          <span className="text-[10px] text-zinc-500">tap to cycle</span>
                        </button>
                      </div>

                      {/* Priority - tap to cycle */}
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Priority</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cycle = ['low', 'medium', 'high', 'urgent'];
                            const idx = cycle.indexOf(candidate.priority);
                            const next = idx >= 0 ? cycle[(idx + 1) % cycle.length] : 'medium';
                            handleFieldChange(candidate.id, 'priority', next);
                          }}
                          title="Tap to cycle priority"
                          className="w-full text-left p-1.5 rounded bg-black/60 border border-white/10 hover:border-white/30 text-white text-xs capitalize border-b border-b-white/40 border-b-dotted flex items-center justify-between cursor-pointer min-h-[34px]"
                        >
                          <span
                            className={
                              candidate.priority === 'urgent'
                                ? 'text-rose-400 font-semibold'
                                : candidate.priority === 'high'
                                ? 'text-orange-400 font-medium'
                                : candidate.priority === 'low'
                                ? 'text-zinc-400'
                                : 'text-zinc-200'
                            }
                          >
                            {candidate.priority}
                          </span>
                          <span className="text-[10px] text-zinc-500">tap to cycle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit text</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Import {selectedCount} task{selectedCount === 1 ? '' : 's'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
