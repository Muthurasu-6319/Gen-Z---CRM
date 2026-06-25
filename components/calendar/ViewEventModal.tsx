// src/components/calendar/ViewEventModal.tsx

import React from 'react';
import Modal from '../common/Modal';
import { usePermissions } from '../auth/PermissionsContext';

interface EventData {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  assignedUsernames: string[];
  created_by: string;
}

interface ViewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  event: EventData | null;
}

const ViewEventModal: React.FC<ViewEventModalProps> = ({ isOpen, onClose, onEdit, onDelete, event }) => {
    const { currentUser } = usePermissions();
    if (!event) return null;

    // Show edit/delete only if user is the creator
    const canModify = currentUser?.id === event.created_by;
    
    // THIS IS THE FIX:
    // Create a robust time string. Check if `start` and `end` are valid Date objects before
    // calling toLocaleString(). If not, show a fallback text.
    // This prevents the "Cannot read properties of undefined (reading 'toLocaleString')" error.
    const timeString = (event.start && event.end) 
        ? `${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}`
        : 'Time not specified';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={event.title}>
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-gray-600">Time</h3>
                    <p>{timeString}</p> {/* Use the safe timeString here */}
                </div>
                {event.description && (
                    <div>
                        <h3 className="font-semibold text-gray-600">Description</h3>
                        <p>{event.description}</p>
                    </div>
                )}
                {event.assignedUsernames && event.assignedUsernames.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-600">Assigned To</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {event.assignedUsernames.map(name => (
                                <span key={name} className="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">{name}</span>
                            ))}
                        </div>
                    </div>
                )}
                
                {canModify && (
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button onClick={onDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>
                        <button onClick={onEdit} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Edit</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ViewEventModal;