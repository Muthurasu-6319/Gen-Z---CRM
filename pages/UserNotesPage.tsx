// src/pages/UserNotesPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import rehypeSanitize from 'rehype-sanitize';
import { api } from '../apiClient';
import { PlusIcon, TrashIcon } from '../components/icons/Icons';

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

const UserNotesPage: React.FC<{ title: string }> = ({ title }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
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

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const handleCreateNote = async () => {
      try {
          const newNote = await api.post('/api/user-notes', { title: 'Untitled Note', content: '' });
          if (newNote && newNote.id) {
              setNotes([newNote, ...notes]);
              setActiveNoteId(newNote.id);
          } else {
              console.error('API returned invalid note object:', newNote);
              alert("Please restart your server (npm run dev) to apply the latest backend updates.");
          }
      } catch (err) {
          console.error('Failed to create note:', err);
          alert("Please restart your server (npm run dev) to apply the latest backend updates.");
      }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("Are you sure you want to delete this note?")) return;
      try {
          await api.delete(`/api/user-notes/${id}`);
          const newNotes = notes.filter(n => n.id !== id);
          setNotes(newNotes);
          if (activeNoteId === id) {
              setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
          }
      } catch (err) {
          console.error('Failed to delete note:', err);
      }
  };

  const handleUpdateActiveNote = (updates: Partial<Note>) => {
      if (!activeNoteId) return;
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, ...updates } : n));
  };

  const handleSave = useCallback(async (noteToSave: Note) => {
    if (!noteToSave) return;
    setIsSaving(true);
    try {
      await api.put(`/api/user-notes/${noteToSave.id}`, { 
          title: noteToSave.title, 
          content: noteToSave.content 
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save user note:', err);
    }
    setIsSaving(false);
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (loading || !activeNote) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
        handleSave(activeNote);
    }, 2000); 
    
    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeNote?.content, activeNote?.title, handleSave, loading]); // Dependency on specific fields, not the whole object reference if possible, but fine here

  if (loading && notes.length === 0) return <div className="p-8 text-center text-gray-500">Loading your notes...</div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
                {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : ''}
            </span>
            <button 
                onClick={handleCreateNote}
                className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Note
            </button>
        </div>
      </div>
      
      <div className="flex flex-1 bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        
        {/* Left Sidebar - Note List */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto">
            {notes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm mt-10">No notes yet. Create one!</div>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {notes.map(note => (
                        <li 
                            key={note.id} 
                            onClick={() => setActiveNoteId(note.id)}
                            className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors ${activeNoteId === note.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="truncate pr-2 flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                                        {note.title || 'Untitled Note'}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        {note.content ? note.content.replace(/[#_*\[\]]/g, '').substring(0, 50) + '...' : 'No content'}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteNote(note.id, e)}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                    title="Delete Note"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                                {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        {/* Right Pane - Note Editor */}
        <div className="flex-1 flex flex-col bg-white" data-color-mode="light">
            {activeNote ? (
                <>
                    <div className="p-4 border-b border-gray-200">
                        <input
                            type="text"
                            value={activeNote.title}
                            onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                            placeholder="Note Title"
                            className="w-full text-2xl font-bold border-none focus:outline-none focus:ring-0 text-gray-800"
                        />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <MDEditor
                          value={activeNote.content}
                          onChange={(val) => handleUpdateActiveNote({ content: val || '' })}
                          height="100%"
                          previewOptions={{
                            rehypePlugins: [[rehypeSanitize]],
                          }}
                          className="h-full border-none shadow-none"
                        />
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Select a note to edit or create a new one.
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default UserNotesPage;
