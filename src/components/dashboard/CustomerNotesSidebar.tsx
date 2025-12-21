/**
 * CustomerNotesSidebar Component
 * 
 * Displays a scrollable feed of customer notes with ability to add, edit, and delete.
 * Customer-centric: Shows notes for the customer, unified across all their leads.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Edit2, Trash2, X, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCustomerNotes,
  selectIsLoadingNotes,
  selectNotesError,
  fetchCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  type CustomerNote,
} from '@/store/slices/leadViewSlice';
import { useToast } from '@/hooks/use-toast';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import { cn } from '@/lib/utils';

interface CustomerNotesSidebarProps {
  customerId: string | null;
}

export const CustomerNotesSidebar: React.FC<CustomerNotesSidebarProps> = ({
  customerId,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { close } = useLeadSidebar();
  
  const notes = useAppSelector(selectCustomerNotes(customerId));
  const isLoading = useAppSelector(selectIsLoadingNotes(customerId));
  const error = useAppSelector(selectNotesError(customerId));

  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch notes when customerId changes
  useEffect(() => {
    if (customerId) {
      dispatch(fetchCustomerNotes(customerId));
    }
  }, [customerId, dispatch]);

  // Focus textarea when editing
  useEffect(() => {
    if (editingNoteId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      const length = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(length, length);
    }
  }, [editingNoteId]);

  const handleAddNote = async () => {
    if (!customerId || !newNoteContent.trim()) return;

    try {
      await dispatch(
        addCustomerNote({ customerId, content: newNoteContent.trim() })
      ).unwrap();
      setNewNoteContent('');
      toast({
        title: 'ההערה נוספה בהצלחה',
        description: 'ההערה נשמרה והופיעה בהיסטוריה',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה להוסיף את ההערה',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (note: CustomerNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim()) {
      handleCancelEdit();
      return;
    }

    try {
      await dispatch(
        updateCustomerNote({ noteId, content: editingContent.trim() })
      ).unwrap();
      setEditingNoteId(null);
      setEditingContent('');
      toast({
        title: 'ההערה עודכנה בהצלחה',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לעדכן את ההערה',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את ההערה?')) return;

    try {
      await dispatch(deleteCustomerNote(noteId)).unwrap();
      toast({
        title: 'ההערה נמחקה',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את ההערה',
        variant: 'destructive',
      });
    }
  };

  const formatNoteDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Format as DD.MM.YYYY to match the image
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const formatNoteTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Format as HH:mm for hour display
      return format(date, 'HH:mm', { locale: he });
    } catch {
      return '';
    }
  };

  return (
    <div 
      className="flex-shrink-0 flex flex-col min-h-0 bg-white w-full h-full" 
      dir="rtl"
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-white h-full">
        {/* Header - Matching the image design */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Center: Notes count badge */}
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-sm font-semibold">
                {notes.length}
              </div>
            </div>

            {/* Right side: Document icon + Title */}
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <h2 className="text-base font-semibold text-gray-900">הערות ללקוח</h2>
            </div>
          </div>
        </div>

        {/* Add Note Input Area - Matching the image design */}
        <div className="px-4 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="space-y-3">
            <Textarea
              ref={textareaRef}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="כתוב הערה חדשה..."
              className="min-h-[100px] text-sm resize-none bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-md"
              dir="rtl"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <div className="flex items-center justify-center">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || isLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 h-8 px-4 text-xs"
              >
                <Plus className="h-3.5 w-3.5 ml-1.5" />
                הוסף הערה
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Feed - Scrollable - Matching the image design */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {isLoading && notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
              <p className="text-sm text-gray-500">טוען הערות...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium">אין הערות עדיין</p>
              <p className="text-xs text-gray-400 mt-1">הוסף הערה ראשונה למעלה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-md border border-gray-200 p-3 group"
                >
                  {editingNoteId === note.id ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <Textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[80px] text-sm resize-none bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-md"
                        dir="rtl"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit(note.id);
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-7 px-3 text-gray-600 hover:text-gray-900 text-xs"
                        >
                          <X className="h-3.5 w-3.5 ml-1" />
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editingContent.trim()}
                          className="h-7 px-3 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white text-xs"
                        >
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode - Matching the image layout (compact)
                    <div className="flex items-start gap-2">
                      {/* Left side: Edit/Delete icons (vertically stacked) */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(note)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Right side: Note content and date */}
                      <div className="flex-1 min-w-0">
                        {/* Date and Time with Clock icon - Top right */}
                        <div className="flex items-center justify-end gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-2.5 w-2.5 text-gray-500" />
                          </div>
                          <span className="text-xs font-medium text-gray-900">
                            {formatNoteDate(note.created_at)} {formatNoteTime(note.created_at)}
                          </span>
                        </div>

                        {/* Note content */}
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>

                        {/* Edited indicator if applicable */}
                        {note.updated_at !== note.created_at && (
                          <p className="text-xs text-gray-500 italic mt-1.5">
                            נערך ב-{formatNoteDate(note.updated_at)} {formatNoteTime(note.updated_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


