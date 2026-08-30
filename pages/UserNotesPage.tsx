// src/pages/UserNotesPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import rehypeSanitize from 'rehype-sanitize';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { PlusIcon, TrashIcon } from '../components/icons/Icons';

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

const UserNotesPage: React.FC<{ title: string }> = ({ title }) => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('user-notes', 'create');
  const canEdit = hasPermission('user-notes', 'edit');
  const canDelete = hasPermission('user-notes', 'delete');

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(async () => {
    // // setLoading(true) removed for zero-loading UI removed for zero-loading UI
    try {
      const data = await api.get('/api/user-notes');
      const notesArray = Array.isArray(data) ? data : (data && data.content !== undefined ? [] : []);
      setNotes(notesArray);
      if (notesArray.length > 0 && !activeNoteId) {
        setActiveNoteId(notesArray[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch user notes:', err);
    }
    setLoading(false);
  }, [activeNoteId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-refresh on ANY CRM data update (Global Real-Time Sync)
  useEffect(() => {
    const handleDataUpdated = () => {
      fetchNotes();
    };
    window.addEventListener('crm:data_updated', handleDataUpdated);
    return () => window.removeEventListener('crm:data_updated', handleDataUpdated);
  }, [fetchNotes]);
            )}
        </div>

      </div>
    </div>
  );
};

export default UserNotesPage;
