// src/components/common/Modal.tsx

import React, { useEffect, useRef } from 'react';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // v-- ITHU THAAN FIX --v
      // Modal open aana, MODHAL THADAVA mattum thaan focus ah set pannanum.
      // Ovvoru re-render layum set panna koodathu.
      // But for accessibility, it's better to let the browser handle focus inside the modal.
      // So, namma intha `focus()` call ah remove panradhe better solution.
      // modalRef.current?.focus(); 
      // ^-- INTHA LINE AH COMMENT PANROM ILLANA REMOVE PANROM --^
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 id="modal-title" className="text-xl font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;