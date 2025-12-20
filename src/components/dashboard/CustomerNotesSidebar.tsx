/**
 * CustomerNotesSidebar Component
 * 
 * Displays a scrollable feed of customer notes with ability to add, edit, and delete.
 * Customer-centric: Shows notes for the customer, unified across all their leads.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Send, Edit2, Trash2, X, Check, Clock } from 'lucide-react';
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
      // Always show full date and time for clarity
      return format(date, 'dd/MM/yyyy, HH:mm', { locale: he });
    } catch {
      return dateString;
    }
  };

  return (
    <div 
      className="flex-shrink-0 flex flex-col min-h-0 bg-gray-50 w-[450px]" 
      dir="rtl"
    >
      <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl shadow-lg bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-gray-900">הערות לקוח</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add Note Input Area */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="הוסף הערה חדשה..."
              className="min-h-[80px] text-sm resize-y bg-gray-50 border-gray-300 focus:border-purple-400 focus:ring-purple-400"
              dir="rtl"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Ctrl+Enter לשליחה</span>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-8 px-4"
              >
                <Send className="h-3.5 w-3.5 ml-1.5" />
                שלח
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Feed - Scrollable */}
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
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow group"
                >
                  {editingNoteId === note.id ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <Textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[80px] text-sm resize-y bg-gray-50 border-purple-300 focus:border-purple-400 focus:ring-purple-400"
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
                          className="h-7 px-3 text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-3.5 w-3.5 ml-1" />
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editingContent.trim()}
                          className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Check className="h-3.5 w-3.5 ml-1" />
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-gray-700 leading-relaxed flex-1 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(note)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-3 pt-2 border-t border-gray-100">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">פורסם:</span>
                        <span>{formatNoteDate(note.created_at)}</span>
                        {note.updated_at !== note.created_at && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 italic">נערך ב-{formatNoteDate(note.updated_at)}</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
