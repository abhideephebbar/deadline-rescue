import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Delete task"
    >
      <div className="p-6 space-y-4 font-sans">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-base font-semibold text-white">
            Delete task?
          </h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Are you sure you want to delete this task?
        </p>

        <div className="p-2.5 rounded-lg border border-white/10 bg-black/40 text-xs text-orange-400 font-medium truncate">
          {taskTitle}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
