import React, { useState, useEffect } from 'react';
import { X, Check, Undo2, Trash2, ShieldAlert, GraduationCap } from 'lucide-react';
import { SubjectAttendance } from '../types';
import { calculateAttendanceStats, clampAttendance } from '../utils/attendanceMath';
import { Modal } from './ui/Modal';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectAttendance | null;
  onSave: (subject: SubjectAttendance) => void;
  onDelete?: (id: string) => void;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [thresholdPct, setThresholdPct] = useState<number>(75);
  const [customThreshold, setCustomThreshold] = useState<string>('75');
  const [isCustomThreshold, setIsCustomThreshold] = useState(false);
  const [classesHeld, setClassesHeld] = useState<number>(0);
  const [classesAttended, setClassesAttended] = useState<number>(0);
  const [classesLeft, setClassesLeft] = useState<string>('');
  const [undoStack, setUndoStack] = useState<Array<{ held: number; attended: number }>>([]);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchHeld, setBatchHeld] = useState<number>(5);
  const [batchAttended, setBatchAttended] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (subject) {
        setName(subject.name);
        setCode(subject.code || '');
        setThresholdPct(subject.thresholdPct);
        if (subject.thresholdPct !== 75 && subject.thresholdPct !== 85) {
          setIsCustomThreshold(true);
          setCustomThreshold(String(subject.thresholdPct));
        } else {
          setIsCustomThreshold(false);
        }
        setClassesHeld(subject.classesHeld);
        setClassesAttended(subject.classesAttended);
        setClassesLeft(typeof subject.classesLeft === 'number' ? String(subject.classesLeft) : '');
      } else {
        setName('');
        setCode('');
        setThresholdPct(75);
        setIsCustomThreshold(false);
        setClassesHeld(0);
        setClassesAttended(0);
        setClassesLeft('');
      }
      setUndoStack([]);
      setIsBatchOpen(false);
      setError(null);
    }
  }, [isOpen, subject]);

  const currentSubjectState: SubjectAttendance = {
    id: subject ? subject.id : 'temp',
    name: name.trim() || 'Subject',
    code: code.trim() || undefined,
    thresholdPct,
    classesHeld,
    classesAttended,
    classesLeft: classesLeft ? Math.max(0, parseInt(classesLeft, 10) || 0) : undefined,
  };

  const stats = calculateAttendanceStats(currentSubjectState);

  const handleMarkPresent = () => {
    setUndoStack((prev) => [...prev, { held: classesHeld, attended: classesAttended }]);
    setClassesHeld((h) => h + 1);
    setClassesAttended((a) => a + 1);
  };

  const handleMarkAbsent = () => {
    setUndoStack((prev) => [...prev, { held: classesHeld, attended: classesAttended }]);
    setClassesHeld((h) => h + 1);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setClassesHeld(last.held);
    setClassesAttended(last.attended);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleApplyBatch = () => {
    const addHeld = Math.max(0, Number(batchHeld) || 0);
    const addAttended = Math.max(0, Math.min(addHeld, Number(batchAttended) || 0));
    if (addHeld === 0) return;

    setUndoStack((prev) => [...prev, { held: classesHeld, attended: classesAttended }]);
    setClassesHeld((h) => h + addHeld);
    setClassesAttended((a) => a + addAttended);
    setIsBatchOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a subject name.');
      return;
    }

    const { held, attended, classesLeft: safeLeft } = clampAttendance(
      classesHeld,
      classesAttended,
      classesLeft ? parseInt(classesLeft, 10) : undefined
    );

    const saved: SubjectAttendance = {
      id: subject ? subject.id : `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      code: code.trim() || undefined,
      thresholdPct,
      classesHeld: held,
      classesAttended: attended,
      classesLeft: safeLeft,
    };

    onSave(saved);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={subject ? `${subject.name} attendance` : 'Add subject'}
    >
      <div className="p-5 sm:p-6 space-y-5 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {subject ? 'Manage Attendance' : 'Track Subject Attendance'}
              </h2>
              <p className="text-xs text-zinc-400">
                AICTE / VTU compliance & skip headroom calculator.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Calculation Hero Card */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            stats.unrecoverable
              ? 'border-red-500/30 bg-red-950/20'
              : stats.isBelowThreshold
              ? 'border-amber-500/30 bg-amber-950/20'
              : 'border-white/10 bg-black/40'
          }`}
        >
          <div className="flex items-baseline justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
                Current Standing
              </span>
              <div className="flex items-baseline space-x-2">
                <span
                  className={`text-3xl font-bold font-mono tracking-tight ${
                    stats.isBelowThreshold ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {stats.formattedPct}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  ({classesAttended} / {classesHeld} attended)
                </span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-xs font-medium border ${
                stats.unrecoverable
                  ? 'border-red-500/40 text-red-300 bg-red-500/10'
                  : stats.isBelowThreshold
                  ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                  : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
              }`}
            >
              {stats.summaryText}
            </span>
          </div>

          {/* Honest unrecoverable or low attendance notice */}
          {stats.honestNotice && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2 leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{stats.honestNotice}</span>
            </div>
          )}
        </div>

        {/* Quick Marking Buttons (Mobile thumb-reachable) */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Live Class Check-in
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleMarkPresent}
              className="py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>+ Present</span>
            </button>
            <button
              type="button"
              onClick={handleMarkAbsent}
              className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
            >
              <span>+ Absent</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="text-zinc-400 hover:text-white disabled:opacity-30 flex items-center space-x-1 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo last ({undoStack.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchOpen(!isBatchOpen)}
              className="text-orange-400 hover:text-orange-300 underline cursor-pointer text-[11px]"
            >
              {isBatchOpen ? 'Close bulk log' : 'Log several days at once'}
            </button>
          </div>

          {/* Bulk Logger Collapsible */}
          {isBatchOpen && (
            <div className="p-3 rounded-lg border border-white/10 bg-black/50 space-y-2 text-xs">
              <span className="font-semibold text-zinc-300 block text-[11px]">
                Add multiple classes (e.g. past week)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Classes held (+N)</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchHeld}
                    onChange={(e) => setBatchHeld(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-1.5 rounded bg-black border border-white/20 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Attended (+M)</span>
                  <input
                    type="number"
                    min="0"
                    max={batchHeld}
                    value={batchAttended}
                    onChange={(e) => setBatchAttended(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full p-1.5 rounded bg-black border border-white/20 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyBatch}
                className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Add {batchAttended} of {batchHeld} classes
              </button>
            </div>
          )}
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-white/10">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Subject Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Database Management"
                className="w-full px-3 py-1.5 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DBMS"
                className="w-full px-3 py-1.5 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs font-mono uppercase focus:outline-none"
              />
            </div>
          </div>

          {/* Threshold Selector */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Minimum Threshold Required
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setThresholdPct(75);
                  setIsCustomThreshold(false);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  thresholdPct === 75 && !isCustomThreshold
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                }`}
              >
                75% (AICTE)
              </button>
              <button
                type="button"
                onClick={() => {
                  setThresholdPct(85);
                  setIsCustomThreshold(false);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  thresholdPct === 85 && !isCustomThreshold
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                }`}
              >
                85% (VTU)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomThreshold(true);
                  const p = parseInt(customThreshold, 10) || 75;
                  setThresholdPct(p);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isCustomThreshold
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                }`}
              >
                Custom %
              </button>
            </div>
            {isCustomThreshold && (
              <div className="mt-1.5 flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customThreshold}
                  onChange={(e) => {
                    setCustomThreshold(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0 && val <= 100) {
                      setThresholdPct(val);
                    }
                  }}
                  className="w-20 px-2 py-1 bg-black border border-white/20 rounded text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
                <span className="text-xs text-zinc-500">% minimum</span>
              </div>
            )}
          </div>

          {/* Counts Editing */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Held
              </label>
              <input
                type="number"
                min="0"
                value={classesHeld}
                onChange={(e) => {
                  const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setClassesHeld(h);
                  if (classesAttended > h) setClassesAttended(h);
                }}
                className="w-full px-2.5 py-1.5 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Attended
              </label>
              <input
                type="number"
                min="0"
                max={classesHeld}
                value={classesAttended}
                onChange={(e) => {
                  const a = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setClassesAttended(Math.min(classesHeld, a));
                }}
                className="w-full px-2.5 py-1.5 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Classes left
              </label>
              <input
                type="number"
                min="0"
                placeholder="Optional"
                value={classesLeft}
                onChange={(e) => setClassesLeft(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {subject && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(subject.id);
                  onClose();
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                {subject ? 'Save changes' : 'Add subject'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
