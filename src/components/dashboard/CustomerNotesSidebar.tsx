/**
 * CustomerNotesSidebar Component
 * 
 * Displays a scrollable feed of customer notes with ability to add, edit, and delete.
 * Customer-centric: Shows notes for the customer, unified across all their leads.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit2, Trash2, X, Plus, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCustomerNotes,
  selectIsLoadingNotes,
  selectNotesError,
  selectNoteFilter,
  fetchCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  setNoteFilter,
  type CustomerNote,
} from '@/store/slices/leadViewSlice';
import { useToast } from '@/hooks/use-toast';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import { cn } from '@/lib/utils';

interface LeadOption {
  id: string;
  created_at: string;
  fitness_goal?: string | null;
  status_main?: string | null;
}

interface CustomerNotesSidebarProps {
  customerId: string | null;
  leads?: LeadOption[];
  activeLeadId?: string | null;
}

export const CustomerNotesSidebar: React.FC<CustomerNotesSidebarProps> = ({
  customerId,
  leads = [],
  activeLeadId = null,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { close } = useLeadSidebar();
  
  const allNotes = useAppSelector(selectCustomerNotes(customerId));
  const isLoading = useAppSelector(selectIsLoadingNotes(customerId));
  const error = useAppSelector(selectNotesError(customerId));
  
  // Track the selected lead ID from the dropdown (null = "All Notes")
  // Always default to null (show all notes) when panel opens
  const [selectedLeadIdForFilter, setSelectedLeadIdForFilter] = React.useState<string | null>(
    null
  );
  
  // Determine the effective filter for display (always show all notes by default)
  const selectedLeadId = selectedLeadIdForFilter;
  
  // Sort leads by created_at descending (most recent first) - MUST be defined before use
  const sortedLeads = React.useMemo(() => {
    return [...leads].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [leads]);

  // Get most recent lead ID (for default association when "All Notes" is selected)
  const mostRecentLeadId = React.useMemo(() => {
    if (sortedLeads.length > 0) {
      return sortedLeads[0].id; // First item is most recent (sorted descending)
    }
    return null;
  }, [sortedLeads]);

  // Filter notes based on selected lead
  const notes = React.useMemo(() => {
    if (!selectedLeadId) {
      // Show all notes when "All Notes" is selected
      return allNotes;
    }
    // Filter to show only notes for the selected lead
    // Match notes that have the selected lead_id (strict equality check)
    return allNotes.filter(note => {
      // Convert both to strings for comparison to handle any type mismatches
      const noteLeadId = note.lead_id ? String(note.lead_id) : null;
      const selectedId = String(selectedLeadId);
      return noteLeadId === selectedId;
    });
  }, [allNotes, selectedLeadId]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!customerId || !newNoteContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // When adding a note:
      // - If a specific lead is selected in the dropdown, use that lead_id
      // - If "All Notes" is selected (selectedLeadIdForFilter === null), use activeLeadId from main dashboard
      // - If no activeLeadId, use the most recent lead ID
      // - This ensures every note is associated with a specific inquiry
      let leadId: string | null = null;
      
      if (selectedLeadIdForFilter) {
        // Specific lead selected in dropdown
        leadId = selectedLeadIdForFilter;
      } else {
        // "All Notes" selected - use active lead from main dashboard, or most recent
        leadId = activeLeadId || mostRecentLeadId || null;
      }
      
      console.log('Adding note with:', { 
        customerId, 
        leadId, 
        selectedLeadIdForFilter, 
        activeLeadId, 
        mostRecentLeadId,
        content: newNoteContent.trim() 
      });
      
      await dispatch(
        addCustomerNote({ customerId, content: newNoteContent.trim(), leadId })
      ).unwrap();
      setNewNoteContent('');
      // Clear textarea focus
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
      toast({
        title: 'ההערה נוספה בהצלחה',
        description: 'ההערה נשמרה והופיעה בהיסטוריה',
      });
    } catch (error: any) {
      console.error('Error adding note:', error);
      const errorMessage = error?.message || error?.error || 'לא ניתן היה להוסיף את ההערה';
      toast({
        title: 'שגיאה',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
      const today = new Date();
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      
      if (isToday) {
        return 'היום';
      }
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

  const formatLeadDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const handleFilterChange = (leadId: string | null) => {
    setSelectedLeadIdForFilter(leadId);
  };

  return (
    <div 
      className="flex-shrink-0 flex flex-col min-h-0 bg-white w-full h-full" 
      dir="rtl"
      style={{
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <div className="flex flex-col overflow-hidden bg-white h-full">
        {/* Header - RTL */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0" dir="rtl">
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Right side: Document icon + Title */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <FileText className="h-5 w-5 text-gray-700 flex-shrink-0" />
              <h2 className="text-base font-semibold text-gray-900">הערות ללקוח</h2>
            </div>

            {/* Left side: Notes count badge + Close button */}
            <div className="flex items-center gap-2">
              {/* Notes count badge - circular, on the left */}
              <div className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {notes.length}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Inquiry Selector Dropdown */}
          {customerId && sortedLeads.length > 0 && (
            <div className="mb-3" dir="rtl">
              <Select
                value={selectedLeadIdForFilter || 'all'}
                onValueChange={(value) => {
                  handleFilterChange(value === 'all' ? null : value);
                }}
                dir="rtl"
              >
                <SelectTrigger className="w-full h-9 text-sm border-gray-300 bg-white hover:bg-gray-50">
                  <div className="flex items-center gap-2 flex-1 text-right">
                    <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <SelectValue placeholder="כל ההערות">
                      {selectedLeadIdForFilter ? (
                        (() => {
                          const selectedLead = sortedLeads.find(l => l.id === selectedLeadIdForFilter);
                          if (selectedLead) {
                            const label = selectedLead.fitness_goal || selectedLead.status_main || 'התעניינות';
                            return `${formatLeadDate(selectedLead.created_at)} - ${label}`;
                          }
                          return 'כל ההערות';
                        })()
                      ) : (
                        'כל ההערות'
                      )}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-[300px]">
                  <SelectItem value="all" className="text-right cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">כל ההערות</span>
                      {!selectedLeadIdForFilter && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          פעיל
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                  {sortedLeads.map((lead) => {
                    // Get lead label - prefer fitness_goal, fallback to status_main, then default
                    const leadLabel = lead.fitness_goal || lead.status_main || 'התעניינות';
                    const leadDate = formatLeadDate(lead.created_at);
                    const isSelected = selectedLeadIdForFilter === lead.id;
                    return (
                      <SelectItem key={lead.id} value={lead.id} className="text-right cursor-pointer">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="flex-1 text-right truncate">
                            {leadDate} - {leadLabel}
                          </span>
                          {isSelected && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0 ml-2">
                              פעיל
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input Field - Below title, same border section */}
          <div className="mt-3">
            <Textarea
              ref={textareaRef}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="כתוב הערה חדשה..."
              className="min-h-[100px] text-sm resize-none bg-white border border-gray-300 focus:border-gray-300 focus:ring-0 rounded-md placeholder:text-gray-400"
              dir="rtl"
              style={{ borderColor: '#E5E7EB' }}
              onKeyDown={(e) => {
                // Only submit on Ctrl+Enter or Cmd+Enter
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNote();
                }
                // Allow Enter to create new line normally
              }}
            />
          </div>

          {/* Add Note Button - Below input, same border section */}
          <div className="mt-3 flex items-center justify-end w-full" dir="rtl">
            <Button
              type="button"
              size="sm"
              onClick={(e) => handleAddNote(e)}
              disabled={!newNoteContent.trim() || isLoading || isSubmitting}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-0 rounded-md h-8 px-4 text-xs font-medium w-full flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {isSubmitting ? 'שומר...' : 'הוסף הערה'}
            </Button>
          </div>
        </div>

        {/* Notes Feed - Scrollable - Matching the image design */}
        <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
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
              <p className="text-sm font-medium">
                {selectedLeadId ? 'אין הערות משויכות להתעניינות זו' : 'אין הערות עדיין'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedLeadId ? 'הוסף הערה למעלה' : 'הוסף הערה ראשונה למעלה'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-md border border-gray-200 p-3 group"
                  style={{ 
                    borderColor: '#E0E0E0',
                    backgroundColor: '#F9F9F9'
                  }}
                >
                  {editingNoteId === note.id ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <Textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[80px] text-sm resize-none bg-white border border-gray-300 focus:border-gray-300 focus:ring-0 rounded-md"
                        dir="rtl"
                        style={{ borderColor: '#E5E7EB' }}
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
                    // View Mode - Matching the image layout (compact) - RTL
                    <div className="flex items-start justify-between gap-3" dir="rtl">
                      {/* Content on the right (RTL): Date/hour on top right, text below */}
                      <div className="flex-1 min-w-0 flex flex-col text-right">
                        {/* Date and Time with Clock icon - Top right, same row */}
                        <div className="flex items-center justify-end gap-2 mb-2 w-full flex-shrink-0" dir="ltr">
                          <Clock className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                            {formatNoteDate(note.created_at)} {formatNoteTime(note.created_at)}
                          </span>
                        </div>

                        {/* Note content - Below the date/hour, right-aligned */}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap text-right w-full">
                          {note.content}
                        </p>

                        {/* Edited indicator if applicable - RTL aligned */}
                        {note.updated_at !== note.created_at && (
                          <p className="text-xs text-gray-500 italic mt-1.5 text-right w-full">
                            נערך ב-{formatNoteDate(note.updated_at)} {formatNoteTime(note.updated_at)}
                          </p>
                        )}
                      </div>

                      {/* Buttons on the left (RTL): Edit/Delete icons - Always visible */}
                      <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          type="button"
                          title="ערוך"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          type="button"
                          title="מחק"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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


