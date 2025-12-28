/**
 * FormSubmissionSidebar Component
 * 
 * Resizable side panel displaying Fillout form submission responses.
 * High-density, compact layout with category organization.
 * Can expand up to 2x width (800px) with grid view option.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FileText, X, Loader2, RefreshCw, Maximize2, Grid3x3, List, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAppDispatch } from '@/store/hooks';
import { fetchFormSubmission, type FormType } from '@/store/slices/formsSlice';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import { cn } from '@/lib/utils';
import type { FilloutSubmission } from '@/services/filloutService';
import { ReadOnlyField } from './ReadOnlyField';

interface FormSubmissionSidebarProps {
  formType: FormType;
  submission: FilloutSubmission | null;
  leadId?: string;
  leadEmail?: string;
  leadPhone?: string;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'formSubmissionPanelWidth';
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 350;
const MAX_WIDTH = 800; // 2x the default width

// Category keywords for organizing fields (Hebrew keywords)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'פרטים אישיים': ['שם', 'שם מלא', 'תאריך', 'לידה', 'גיל', 'מגדר', 'טלפון', 'נייד', 'אימייל', 'עיר', 'כתובת', 'יישוב', 'רחוב'],
  'מדדים גופניים': ['משקל', 'גובה', 'BMI', 'מסת שומן', 'מסת שריר', 'אחוז שומן', 'היקף', 'מידות'],
  'סגנון חיים': ['פעילות', 'עבודה', 'שינה', 'עישון', 'אלכוהול', 'תזונה', 'אוכל', 'קפה', 'מים', 'ספורט', 'כושר', 'אימון', 'שגרה'],
  'בריאות': ['בעיה', 'תרופה', 'מחלה', 'אלרגיה', 'בריאות', 'כאב', 'ליקוי', 'בעיות', 'תרופות', 'תחלואה', 'מצב בריאותי'],
  'מטרות ושאיפות': ['מטרה', 'יעד', 'רצון', 'מטרות', 'שאיפה', 'רצונות', 'אתגר', 'ציפיות'],
  'תזונה ואוכל': ['אוכל', 'תזונה', 'דיאטה', 'ארוחות', 'הרגלי אכילה', 'מועדי ארוחות', 'העדפות', 'אלרגיות מזון'],
};

export const FormSubmissionSidebar: React.FC<FormSubmissionSidebarProps> = ({
  formType,
  submission,
  leadId,
  leadEmail,
  leadPhone,
  isLoading,
  error,
}) => {
  const dispatch = useAppDispatch();
  const { close } = useLeadSidebar();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_WIDTH);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
        setWidth(parsedWidth);
      }
    }
  }, []);

  // Save width to localStorage and dispatch custom event
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
    // Dispatch custom event so PageLayout can update its layout
    window.dispatchEvent(new CustomEvent('formSubmissionPanelResize', { detail: { width } }));
  }, [width]);

  // Auto-expand to grid view when width >= 600px
  useEffect(() => {
    if (width >= 600 && viewMode === 'list') {
      setViewMode('grid');
    } else if (width < 600 && viewMode === 'grid') {
      setViewMode('list');
    }
  }, [width, viewMode]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [width]);

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Handle is on left edge (right edge in RTL)
      // In RTL, dragging left (smaller clientX) = expand, dragging right (larger clientX) = shrink
      const deltaX = startXRef.current - e.clientX; // Inverted for RTL left-edge handle
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + deltaX)
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const formatAnswer = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    const str = String(value);
    // Truncate very long values
    return str.length > 200 ? str.substring(0, 200) + '...' : str;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: he });
    } catch {
      return dateString;
    }
  };

  const fetchData = React.useCallback(() => {
    if (leadId || leadEmail || leadPhone) {
      dispatch(
        fetchFormSubmission({
          formType: formType.key as 'details' | 'intro' | 'characterization',
          leadId: leadId,
          email: leadEmail,
          phoneNumber: leadPhone,
        })
      ).catch((err) => {
        console.error('[FormSubmissionSidebar] Error fetching submission:', err);
      });
    }
  }, [leadId, leadEmail, leadPhone, formType.key, dispatch]);

  // Categorize questions
  const categorizedQuestions = useMemo(() => {
    if (!submission?.questions) return {};

    const categories: Record<string, typeof submission.questions> = {};
    const uncategorized: typeof submission.questions = [];

    submission.questions.forEach((question) => {
      const questionName = question.name?.toLowerCase() || '';
      let categorized = false;

      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => questionName.includes(keyword.toLowerCase()))) {
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push(question);
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        uncategorized.push(question);
      }
    });

    if (uncategorized.length > 0) {
      categories['אחר'] = uncategorized;
    }

    return categories;
  }, [submission]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
    // Mark as initialized once user interacts
    if (!categoriesInitialized) {
      setCategoriesInitialized(true);
    }
  };

  // Toggle all categories collapse/expand
  const toggleAllCategories = () => {
    const allCategoryKeys = Object.keys(categorizedQuestions);
    const allExpanded = allCategoryKeys.every(key => expandedCategories.has(key));
    
    if (allExpanded) {
      // Collapse all
      setExpandedCategories(new Set());
    } else {
      // Expand all
      setExpandedCategories(new Set(allCategoryKeys));
    }
    setCategoriesInitialized(true);
  };

  // Expand all categories by default (only on initial load)
  useEffect(() => {
    if (submission?.questions && !categoriesInitialized && Object.keys(categorizedQuestions).length > 0) {
      setExpandedCategories(new Set(Object.keys(categorizedQuestions)));
      setCategoriesInitialized(true);
    }
  }, [submission, categorizedQuestions, categoriesInitialized]);

  // Reset initialization when submission changes
  useEffect(() => {
    if (submission) {
      setCategoriesInitialized(false);
    }
  }, [submission?.submissionId]);

  const isExpanded = width >= 600;

  return (
    <div 
      ref={panelRef}
      className="relative flex-shrink-0 flex flex-col min-h-0"
      style={{ width: `${width}px` }}
      dir="rtl"
    >
      {/* Resize Handle - Right edge (left edge in RTL) */}
      <div
        ref={resizeHandleRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 bottom-0 w-1 bg-transparent hover:bg-blue-400/30 cursor-col-resize z-50 transition-colors",
          isResizing && "bg-blue-400/50"
        )}
        style={{ left: 0 }}
        title="גרור כדי לשנות גודל"
      />

      <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl bg-white h-full">
        {/* Header - Compact */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 truncate">{formType.label}</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Collapse/Expand All Button - Only show when submission exists and has categories */}
              {submission && Object.keys(categorizedQuestions).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllCategories}
                  className="h-6 text-xs px-2 py-0"
                >
                  <ChevronsUpDown className="h-3 w-3 ml-1" />
                  {Object.keys(categorizedQuestions).every(key => expandedCategories.has(key))
                    ? 'כווץ הכל'
                    : 'הרחב הכל'}
                </Button>
              )}
              {/* View Mode Toggle - Only show when expanded */}
              {isExpanded && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className={cn(
                      "h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-white/80",
                      viewMode === 'grid' && "bg-blue-50 text-blue-600"
                    )}
                    title={viewMode === 'grid' ? 'תצוגת רשימה' : 'תצוגת רשת'}
                  >
                    {viewMode === 'grid' ? (
                      <List className="h-3.5 w-3.5" />
                    ) : (
                      <Grid3x3 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                className="h-6 w-6 text-gray-500 hover:text-gray-900 hover:bg-white/80"
                title="סגור"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {/* Submission Date - Compact */}
          {submission && (
            <div className="mt-1 text-[10px] text-gray-400">
              הגשה: {formatDate(submission.submissionTime)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
              <p className="text-xs text-slate-600">טוען תשובות...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-6">
              <div className="flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right mb-4 max-w-md">
                <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>
                  שגיאה בטעינת הטופס:
                </span>
                <span 
                  className="text-sm font-semibold text-red-600 flex-1 min-w-0 break-words"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                >
                  {error}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 ml-1" />
                נסה שוב
              </Button>
            </div>
          ) : !submission ? (
            <div className="flex flex-col items-center justify-center py-8 px-6">
              <div className="flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right mb-4 max-w-md">
                <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>
                  סטטוס הגשה:
                </span>
                <span 
                  className="text-sm font-semibold text-slate-900 flex-1 min-w-0 break-words"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                >
                  הלקוח עדיין לא הגיש את הטופס הזה
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 ml-1" />
                רענון
              </Button>
            </div>
          ) : (
            <div className="p-6">
              {Object.keys(categorizedQuestions).length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">אין תשובות להצגה</p>
              ) : (
                <div className="space-y-4">
                    {Object.entries(categorizedQuestions).map(([category, questions]) => {
                      const isExpanded = expandedCategories.has(category);
                      
                      return (
                        <Card
                          key={category}
                          className="border border-slate-100 rounded-xl shadow-md bg-white overflow-hidden"
                        >
                          {/* Category Header - Collapsible */}
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between border-b border-slate-100"
                          >
                            <h3 className="text-sm font-bold text-gray-900">{category}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-normal">
                                ({questions.length})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Category Content */}
                          {isExpanded && (
                            <div className={cn(
                              "p-6",
                              viewMode === 'grid' && width >= 600 ? "grid grid-cols-2 gap-x-4 gap-y-4" : "space-y-4"
                            )}>
                              {questions.map((question, index) => (
                                <ReadOnlyField
                                  key={question.id || index}
                                  label={question.name || 'שדה ללא שם'}
                                  value={formatAnswer(question.value)}
                                  className="border-0 p-0"
                                  valueClassName="break-words"
                                />
                              ))}
                            </div>
                          )}
                        </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
