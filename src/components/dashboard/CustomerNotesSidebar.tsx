/**
 * CustomerNotesSidebar Component
 * 
 * Displays a scrollable feed of customer notes with ability to add, edit, and delete.
 * Customer-centric: Shows notes for the customer, unified across all their leads.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit2, Trash2, X, Plus, Clock, Filter, Paperclip, Image as ImageIcon, File, Loader2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabaseClient';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

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
  const { closeNotes } = useLeadSidebar();
  
  // Memoize selectors to prevent creating new selectors on every render
  const customerNotesSelector = useMemo(
    () => selectCustomerNotes(customerId),
    [customerId]
  );
  const isLoadingNotesSelector = useMemo(
    () => selectIsLoadingNotes(customerId),
    [customerId]
  );
  const notesErrorSelector = useMemo(
    () => selectNotesError(customerId),
    [customerId]
  );
  
  const allNotes = useAppSelector(customerNotesSelector);
  const isLoading = useAppSelector(isLoadingNotesSelector);
  const error = useAppSelector(notesErrorSelector);
  
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
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Map<number, string>>(new Map());
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [editingAttachmentFiles, setEditingAttachmentFiles] = useState<File[]>([]);
  const [editingAttachmentPreviews, setEditingAttachmentPreviews] = useState<Map<number, string>>(new Map());
  const [editingExistingAttachmentUrls, setEditingExistingAttachmentUrls] = useState<string[]>([]);
  const [originalAttachmentUrls, setOriginalAttachmentUrls] = useState<string[]>([]);
  const [isUploadingEditAttachment, setIsUploadingEditAttachment] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file selection (multiple files)
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const newFiles: File[] = [];
    const newPreviews = new Map(attachmentPreviews);
    
    Array.from(files).forEach((file, index) => {
      // Validate file type
      if (!validImageTypes.includes(file.type) && !validDocTypes.includes(file.type)) {
        toast({
          title: 'סוג קובץ לא נתמך',
          description: `הקובץ "${file.name}" אינו נתמך. אנא העלה תמונה או מסמך (PDF, Word)`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'קובץ גדול מדי',
          description: `הקובץ "${file.name}" גדול מדי. גודל הקובץ לא יכול לעלות על 10MB`,
          variant: 'destructive',
        });
        return;
      }

      newFiles.push(file);
      const fileIndex = attachmentFiles.length + newFiles.length - 1;

      // Create preview for images
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.set(fileIndex, e.target?.result as string);
          setAttachmentPreviews(new Map(newPreviews));
        };
        reader.readAsDataURL(file);
      }
    });

    if (newFiles.length > 0) {
      setAttachmentFiles([...attachmentFiles, ...newFiles]);
    }
  };

  // Upload multiple attachments to Supabase Storage
  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    if (!customerId || files.length === 0) return [];

    try {
      setIsUploadingAttachment(true);
      const uploadedPaths: string[] = [];

      for (const file of files) {
        // Generate unique filename
        const timestamp = Date.now() + Math.random();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}.${fileExt}`;
        const filePath = `${customerId}/notes/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          toast({
            title: 'שגיאה',
            description: `נכשל בהעלאת "${file.name}": ${uploadError.message}`,
            variant: 'destructive',
          });
          continue;
        }

        uploadedPaths.push(filePath);
      }

      return uploadedPaths;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן היה להעלות את הקבצים',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Delete attachment from Supabase Storage
  const deleteAttachment = async (attachmentUrl: string) => {
    try {
      const { error } = await supabase.storage
        .from('client-assets')
        .remove([attachmentUrl]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את הקובץ',
        variant: 'destructive',
      });
    }
  };

  // Get signed URL for attachment
  const getAttachmentUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(path, 3600);

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      return null;
    }
  };

  const handleAddNote = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!customerId || (!newNoteContent.trim() && attachmentFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Upload attachments if present
      let attachmentUrl: string | null = null;
      if (attachmentFiles.length > 0) {
        const uploadedPaths = await uploadAttachments(attachmentFiles);
        if (uploadedPaths.length === 0 && attachmentFiles.length > 0) {
          // If all uploads failed, don't create the note
          setIsSubmitting(false);
          return;
        }
        // Store as JSON array
        attachmentUrl = JSON.stringify(uploadedPaths);
      }

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
      
      await dispatch(
        addCustomerNote({ 
          customerId, 
          content: newNoteContent.trim() || '', 
          leadId,
          attachmentUrl
        })
      ).unwrap();
      
      setNewNoteContent('');
      setAttachmentFiles([]);
      setAttachmentPreviews(new Map());
      
      // Clear textarea focus
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'ההערה נוספה בהצלחה',
        description: 'ההערה נשמרה והופיעה בהיסטוריה',
      });
    } catch (error: any) {
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
    setEditingAttachmentFiles([]);
    setEditingAttachmentPreviews(new Map());
    
    // Parse existing attachment URLs (could be single string or JSON array)
    let existingUrls: string[] = [];
    if (note.attachment_url) {
      try {
        const parsed = JSON.parse(note.attachment_url);
        existingUrls = Array.isArray(parsed) ? parsed : [note.attachment_url];
      } catch {
        existingUrls = [note.attachment_url];
      }
    }
    setEditingExistingAttachmentUrls(existingUrls);
    setOriginalAttachmentUrls(existingUrls);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingAttachmentFiles([]);
    setEditingAttachmentPreviews(new Map());
    setEditingExistingAttachmentUrls([]);
    setOriginalAttachmentUrls([]);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleEditFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const newFiles: File[] = [];
    const newPreviews = new Map(editingAttachmentPreviews);
    
    Array.from(files).forEach((file, index) => {
      // Validate file type
      if (!validImageTypes.includes(file.type) && !validDocTypes.includes(file.type)) {
        toast({
          title: 'סוג קובץ לא נתמך',
          description: `הקובץ "${file.name}" אינו נתמך. אנא העלה תמונה או מסמך (PDF, Word)`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'קובץ גדול מדי',
          description: `הקובץ "${file.name}" גדול מדי. גודל הקובץ לא יכול לעלות על 10MB`,
          variant: 'destructive',
        });
        return;
      }

      newFiles.push(file);
      const fileIndex = editingAttachmentFiles.length + newFiles.length - 1;

      // Create preview for images
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.set(fileIndex, e.target?.result as string);
          setEditingAttachmentPreviews(new Map(newPreviews));
        };
        reader.readAsDataURL(file);
      }
    });

    if (newFiles.length > 0) {
      setEditingAttachmentFiles([...editingAttachmentFiles, ...newFiles]);
    }
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim() && editingAttachmentFiles.length === 0 && editingExistingAttachmentUrls.length === 0) {
      handleCancelEdit();
      return;
    }

    try {
      setIsUploadingEditAttachment(true);
      
      // Handle attachments: upload new files, keep existing, or remove
      let attachmentUrl: string | null = null;
      const allAttachmentUrls: string[] = [...editingExistingAttachmentUrls];
      
      if (editingAttachmentFiles.length > 0) {
        // Upload new files
        const uploadedPaths = await uploadAttachments(editingAttachmentFiles);
        allAttachmentUrls.push(...uploadedPaths);
      }
      
      // Delete old attachments that were removed
      const removedUrls = originalAttachmentUrls.filter(url => !editingExistingAttachmentUrls.includes(url));
      for (const url of removedUrls) {
        await deleteAttachment(url);
      }
      
      // Store as JSON array if there are attachments
      if (allAttachmentUrls.length > 0) {
        attachmentUrl = JSON.stringify(allAttachmentUrls);
      } else {
        attachmentUrl = null;
        // Delete all original attachments if no attachments remain
        for (const url of originalAttachmentUrls) {
          await deleteAttachment(url);
        }
      }

      await dispatch(
        updateCustomerNote({ 
          noteId, 
          content: editingContent.trim() || '', 
          attachmentUrl 
        })
      ).unwrap();
      
      setEditingNoteId(null);
      setEditingContent('');
      setEditingAttachmentFiles([]);
      setEditingAttachmentPreviews(new Map());
      setEditingExistingAttachmentUrls([]);
      setOriginalAttachmentUrls([]);
      
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
      
      toast({
        title: 'ההערה עודכנה בהצלחה',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לעדכן את ההערה',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingEditAttachment(false);
    }
  };

  const handleDeleteAttachment = async (note: CustomerNote, attachmentUrlToDelete: string) => {
    if (!note.attachment_url) return;

    if (!confirm('האם אתה בטוח שברצונך למחוק את הקובץ המצורף?')) return;

    try {
      // Parse attachment URLs
      let attachmentUrls: string[] = [];
      try {
        const parsed = JSON.parse(note.attachment_url);
        attachmentUrls = Array.isArray(parsed) ? parsed : [note.attachment_url];
      } catch {
        attachmentUrls = [note.attachment_url];
      }
      
      // Remove the specific attachment
      const remainingUrls = attachmentUrls.filter(url => url !== attachmentUrlToDelete);
      
      // Delete from storage
      await deleteAttachment(attachmentUrlToDelete);

      // Update note with remaining attachments
      const newAttachmentUrl = remainingUrls.length > 0 ? JSON.stringify(remainingUrls) : null;
      await dispatch(
        updateCustomerNote({ noteId: note.id, content: note.content, attachmentUrl: newAttachmentUrl })
      ).unwrap();

      toast({
        title: 'הצלחה',
        description: 'הקובץ נמחק',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את הקובץ',
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
              <h2 className="text-base font-semibold text-gray-900">הערות לקוח</h2>
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
                onClick={closeNotes}
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
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="כתוב הערה חדשה..."
                className="min-h-[100px] text-sm resize-none bg-white border border-gray-300 focus:border-gray-300 focus:ring-0 rounded-md placeholder:text-gray-400 pr-10"
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 left-2 h-7 w-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="צרף קובץ"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            {/* Attachment Previews */}
            {attachmentFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachmentFiles.map((file, index) => {
                  const preview = attachmentPreviews.get(index);
                  return (
                    <div key={index} className="relative inline-block rounded-md border border-gray-200 p-2">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="flex items-center gap-2 h-20 px-2">
                          <File className="h-4 w-4 text-gray-500" />
                          <span className="text-xs text-gray-700 truncate max-w-[120px]">
                            {file.name}
                          </span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newFiles = attachmentFiles.filter((_, i) => i !== index);
                          const newPreviews = new Map(attachmentPreviews);
                          newPreviews.delete(index);
                          // Reindex previews
                          const reindexedPreviews = new Map<number, string>();
                          newFiles.forEach((_, i) => {
                            const oldIndex = i >= index ? i + 1 : i;
                            if (attachmentPreviews.has(oldIndex)) {
                              reindexedPreviews.set(i, attachmentPreviews.get(oldIndex)!);
                            }
                          });
                          setAttachmentFiles(newFiles);
                          setAttachmentPreviews(reindexedPreviews);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Note Button - Below input, same border section */}
          <div className="mt-3 flex items-center justify-end w-full" dir="rtl">
            <Button
              type="button"
              size="sm"
              onClick={(e) => handleAddNote(e)}
              disabled={(!newNoteContent.trim() && attachmentFiles.length === 0) || isLoading || isSubmitting || isUploadingAttachment}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-0 rounded-md h-8 px-4 text-xs font-medium w-full flex items-center justify-center gap-1.5"
            >
              {isSubmitting || isUploadingAttachment ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isUploadingAttachment ? 'מעלה קובץ...' : 'שומר...'}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  הוסף הערה
                </>
              )}
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
                      <div className="relative">
                        <Textarea
                          ref={editTextareaRef}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[80px] text-sm resize-none bg-white border border-gray-300 focus:border-gray-300 focus:ring-0 rounded-md pr-10"
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
                        <input
                          ref={editFileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            handleEditFileSelect(e.target.files);
                          }}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => editFileInputRef.current?.click()}
                          className="absolute top-2 left-2 h-7 w-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          title="צרף קובץ"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Existing Attachments Display in Edit Mode */}
                      {editingExistingAttachmentUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editingExistingAttachmentUrls.map((url, index) => (
                            <div key={index} className="relative">
                              <AttachmentDisplay
                                attachmentUrl={url}
                                onDelete={() => {
                                  const newUrls = editingExistingAttachmentUrls.filter((_, i) => i !== index);
                                  setEditingExistingAttachmentUrls(newUrls);
                                }}
                                onViewImage={(url) => {
                                  setLightboxImage(url);
                                  setLightboxOpen(true);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Attachment Previews in Edit Mode */}
                      {editingAttachmentFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editingAttachmentFiles.map((file, index) => {
                            const preview = editingAttachmentPreviews.get(index);
                            return (
                              <div key={index} className="relative inline-block rounded-md border border-gray-200 p-2">
                                {preview ? (
                                  <img
                                    src={preview}
                                    alt="Preview"
                                    className="h-20 w-20 object-cover rounded"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 h-20 px-2">
                                    <File className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs text-gray-700 truncate max-w-[120px]">
                                      {file.name}
                                    </span>
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newFiles = editingAttachmentFiles.filter((_, i) => i !== index);
                                    const newPreviews = new Map(editingAttachmentPreviews);
                                    newPreviews.delete(index);
                                    // Reindex previews
                                    const reindexedPreviews = new Map<number, string>();
                                    newFiles.forEach((_, i) => {
                                      const oldIndex = i >= index ? i + 1 : i;
                                      if (editingAttachmentPreviews.has(oldIndex)) {
                                        reindexedPreviews.set(i, editingAttachmentPreviews.get(oldIndex)!);
                                      }
                                    });
                                    setEditingAttachmentFiles(newFiles);
                                    setEditingAttachmentPreviews(reindexedPreviews);
                                    if (editFileInputRef.current) {
                                      editFileInputRef.current.value = '';
                                    }
                                  }}
                                  className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

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
                          disabled={(!editingContent.trim() && editingAttachmentFiles.length === 0 && editingExistingAttachmentUrls.length === 0) || isUploadingEditAttachment}
                          className="h-7 px-3 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white text-xs"
                        >
                          {isUploadingEditAttachment ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                              מעלה...
                            </>
                          ) : (
                            'שמור'
                          )}
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
                        {note.content && (
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap text-right w-full">
                            {note.content}
                          </p>
                        )}

                        {/* Attachments Display */}
                        {note.attachment_url && (() => {
                          // Parse attachment URLs (could be single string or JSON array)
                          let attachmentUrls: string[] = [];
                          try {
                            const parsed = JSON.parse(note.attachment_url);
                            attachmentUrls = Array.isArray(parsed) ? parsed : [note.attachment_url];
                          } catch {
                            attachmentUrls = [note.attachment_url];
                          }
                          
                          return (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {attachmentUrls.map((url, index) => (
                                <AttachmentDisplay
                                  key={index}
                                  attachmentUrl={url}
                                  onDelete={() => {
                                    // Remove this specific attachment
                                    const remainingUrls = attachmentUrls.filter((_, i) => i !== index);
                                    const newAttachmentUrl = remainingUrls.length > 0 ? JSON.stringify(remainingUrls) : null;
                                    dispatch(updateCustomerNote({ noteId: note.id, content: note.content, attachmentUrl: newAttachmentUrl }));
                                    // Delete from storage
                                    deleteAttachment(url);
                                  }}
                                  onViewImage={(url) => {
                                    setLightboxImage(url);
                                    setLightboxOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          );
                        })()}

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

      {/* Lightbox for viewing images */}
      {lightboxImage && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => {
            setLightboxOpen(false);
            setLightboxImage(null);
          }}
          images={[lightboxImage]}
          currentIndex={0}
        />
      )}
    </div>
  );
};

// Attachment Display Component
interface AttachmentDisplayProps {
  attachmentUrl: string;
  onDelete: () => void;
  onViewImage: (url: string) => void;
}

const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachmentUrl,
  onDelete,
  onViewImage,
}) => {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachmentUrl);

  React.useEffect(() => {
    const loadUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('client-assets')
          .createSignedUrl(attachmentUrl, 3600);

        if (error) throw error;
        setSignedUrl(data?.signedUrl || null);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    loadUrl();
  }, [attachmentUrl]);

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>טוען קובץ...</span>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="mt-2 text-sm text-red-500">
        שגיאה בטעינת הקובץ
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="mt-2 relative inline-block">
        <img
          src={signedUrl}
          alt="Attachment"
          className="h-32 w-32 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onViewImage(signedUrl)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Document file
  return (
    <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
      <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#5B6FB9] hover:underline flex-1 truncate"
      >
        {attachmentUrl.split('/').pop()}
      </a>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="h-6 w-6 text-red-500 hover:text-red-600"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};


