import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, Check, ExternalLink, Sparkles, Send } from 'lucide-react';
import { Task } from '../types';
import { generateInstructorEmail } from '../utils/recovery';

interface InstructorEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onMarkSubmitted?: (taskId: string) => void;
}

export const InstructorEmailModal: React.FC<InstructorEmailModalProps> = ({
  isOpen,
  onClose,
  task,
  onMarkSubmitted,
}) => {
  const [templateType, setTemplateType] = useState<'extension' | 'partial_submission' | 'office_hours'>('extension');
  const [copied, setCopied] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Update text when task or template changes
  useEffect(() => {
    if (task) {
      const generated = generateInstructorEmail(task, templateType);
      setEmailSubject(generated.subject);
      setEmailBody(generated.body);
    }
  }, [task, templateType]);

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

  if (!isOpen || !task) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructor-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#111111] border border-orange-500/40 text-white font-mono shadow-[0_0_50px_rgba(249,115,22,0.15)] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs uppercase tracking-widest font-bold">
              <Mail className="w-4 h-4 text-orange-500" />
              <span>RECOVERY ACTION // INSTRUCTOR OUTREACH</span>
            </div>
            <h2 id="instructor-email-title" className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
              Reach Out Without Anxiety
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Professors appreciate clear, proactive communication. Sending a thoughtful message demonstrates responsibility and opens doors for partial credit.
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

        {/* Task Details Banner */}
        <div className="p-3 border border-white/10 bg-black/40 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase text-zinc-500 tracking-wider">TARGET COURSEWORK:</span>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 border border-white/20 text-orange-400 font-bold">{task.course}</span>
              <span className="font-bold text-white uppercase">{task.title}</span>
            </div>
          </div>
          <span className="text-zinc-500 text-[11px]">{task.category}</span>
        </div>

        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
            SELECT OUTREACH INTENT:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTemplateType('extension')}
              className={`p-2.5 text-left border transition-all cursor-pointer ${
                templateType === 'extension'
                  ? 'border-orange-500 bg-orange-500/10 text-white font-bold'
                  : 'border-white/10 bg-black/30 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span className="text-orange-400 block text-[10px] uppercase">01 // EXTENSION</span>
              <span className="text-xs">Ask for 24-48h reset</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('partial_submission')}
              className={`p-2.5 text-left border transition-all cursor-pointer ${
                templateType === 'partial_submission'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                  : 'border-white/10 bg-black/30 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span className="text-emerald-400 block text-[10px] uppercase">02 // PARTIAL WORK</span>
              <span className="text-xs">Submit what you have</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('office_hours')}
              className={`p-2.5 text-left border transition-all cursor-pointer ${
                templateType === 'office_hours'
                  ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                  : 'border-white/10 bg-black/30 text-zinc-400 hover:border-white/20'
              }`}
            >
              <span className="text-blue-400 block text-[10px] uppercase">03 // OFFICE HOURS</span>
              <span className="text-xs">Request check-in</span>
            </button>
          </div>
        </div>

        {/* Subject & Body Fields */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">
              EMAIL SUBJECT:
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full p-2.5 bg-black border border-white/20 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                MESSAGE BODY:
              </label>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-400" />
                Personalize as needed
              </span>
            </div>
            <textarea
              rows={8}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full p-3 bg-black border border-white/20 text-white font-mono text-xs focus:border-orange-500 focus:outline-none leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* Reassurance note */}
        <div className="p-3 border border-white/5 bg-zinc-950 text-[11px] text-zinc-400">
          💡 <strong>Tip:</strong> Send this from your university email account (.edu). Most instructors appreciate student honesty when faced with heavy crunch weeks.
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              type="button"
              className="px-4 py-2 border border-white/20 hover:border-white/40 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Draft</span>
                </>
              )}
            </button>

            <a
              href={mailtoUrl}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Mail App</span>
            </a>
          </div>

          {onMarkSubmitted && (
            <button
              onClick={() => {
                onMarkSubmitted(task.id);
                onClose();
              }}
              type="button"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark as Submitted</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

