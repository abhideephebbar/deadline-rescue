import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, Check, ExternalLink, Send } from 'lucide-react';
import { Task } from '../types';
import { generateInstructorEmail } from '../utils/recovery';
import { Modal } from './ui/Modal';

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
    <Modal
      isOpen={isOpen && !!task}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title="Email instructor"
    >
      {task && (
        <div className="p-6 sm:p-7 space-y-6 font-sans">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
                <Mail className="w-4 h-4 text-orange-500" />
                <span>Instructor message</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                Reach out without anxiety
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Professors appreciate proactive communication. A thoughtful message demonstrates responsibility.
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

          {/* Task Details Banner */}
          <div className="p-3 rounded-lg border border-white/10 bg-black/40 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-zinc-400">Coursework:</span>
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded border border-white/20 text-orange-400 font-bold whitespace-nowrap shrink-0">{task.course}</span>
                <span className="font-semibold text-white">{task.title}</span>
              </div>
            </div>
            <span className="text-zinc-400 text-xs capitalize">{task.category}</span>
          </div>

          {/* Template Selector Pills */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
              Choose template:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('extension')}
                className={`p-3 rounded-lg text-left border transition-all ${
                  templateType === 'extension'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-medium text-white mb-0.5">1. Request Extension</div>
                <p className="text-[11px] text-zinc-400">Polite request for 24-48h extra</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('partial_submission')}
                className={`p-3 rounded-lg text-left border transition-all ${
                  templateType === 'partial_submission'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-medium text-white mb-0.5">2. Partial Work</div>
                <p className="text-[11px] text-zinc-400">Submit what is done for partial credit</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('office_hours')}
                className={`p-3 rounded-lg text-left border transition-all ${
                  templateType === 'office_hours'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-medium text-white mb-0.5">3. Office Hours</div>
                <p className="text-[11px] text-zinc-400">Ask for help on blockers</p>
              </button>
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">Subject line</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-white/15 text-white text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Body Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">Message draft</label>
            <textarea
              rows={8}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-black border border-white/15 text-white text-xs leading-relaxed focus:border-orange-500 focus:outline-none resize-y"
            />
          </div>

          {/* Tip */}
          <div className="p-3 rounded-lg border border-white/5 bg-zinc-950 text-xs text-zinc-400">
            💡 <strong>Tip:</strong> Send this from your university email account (.edu). Most instructors appreciate student honesty.
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                type="button"
                className="px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy draft</span>
                  </>
                )}
              </button>

              <a
                href={mailtoUrl}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in mail</span>
              </a>
            </div>

            {onMarkSubmitted && (
              <button
                onClick={() => {
                  onMarkSubmitted(task.id);
                  onClose();
                }}
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mark as submitted</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
