import React from 'react';
import { Dialog } from '@headlessui/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  confirmButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>; // Optional props for the confirm button
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, message, confirmButtonProps }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <Dialog.Overlay className="fixed inset-0 bg-black/30" />
      <div className="bg-white rounded-lg p-6 mx-auto max-w-md z-50">
        <Dialog.Title className="text-lg font-medium">Confirmation</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-gray-500">
          {message}
        </Dialog.Description>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('inside component');
              onConfirm();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            {...confirmButtonProps} // Apply confirmButtonProps here
          >
            {confirmButtonProps?.children || 'Confirm'} {/* Display custom text if provided */}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmationModal;
