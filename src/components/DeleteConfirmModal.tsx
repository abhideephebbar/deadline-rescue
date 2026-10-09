import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0e0e0e] border border-red-500/50 shadow-2xl p-6 z-10 space-y-4">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.25em]">
            SYSTEM ALERT // PURGE RECORD
          </span>
        </div>

        <div>
          <h3 className="font-display text-2xl text-white uppercase tracking-tight">
            Delete Coursework Target
          </h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to permanently purge this task from your triage radar?
          </p>
          <div className="mt-3 p-2 border border-white/10 bg-black text-xs text-orange-400 font-semibold truncate">
            &gt; {taskTitle}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white text-xs uppercase tracking-wider transition-colors"
          >
            Abort
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
            className="inline-flex items-center space-x-1.5 px-4 py-2 border border-red-500 bg-red-600 text-white hover:bg-red-500 text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
