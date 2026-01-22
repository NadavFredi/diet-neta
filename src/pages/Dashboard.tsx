import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { LeadsDataTable } from '@/components/dashboard/LeadsDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { Pagination } from '@/components/dashboard/Pagination';
import { allLeadColumns } from '@/components/dashboard/columns/leadColumns';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { getLeadFilterFields, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { fetchLeadIdsByFilter } from '@/services/leadService';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectActiveFilters, selectColumnOrder, selectColumnSizing, selectFilterGroup, selectGroupByKeys } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount, getAllGroupKeys } from '@/utils/groupDataByKey';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user: authUser, isAuthenticated, isLoading: authIsLoading } = useAppSelector((state) => state.auth);
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'leads'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'leads'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'leads'));
  const columnOrder = useAppSelector((state) => selectColumnOrder(state, 'leads'));
  const columnSizing = useAppSelector((state) => selectColumnSizing(state, 'leads'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  // Safety check: Redirect trainees immediately
  useEffect(() => {
    if (authUser?.role === 'trainee') {
      window.location.href = '/client/dashboard';
      return;
    }
  }, [authUser, isAuthenticated, authIsLoading]);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('leads');
  const hasShownSaveSuggestion = useRef(false);
  const previousFiltersRef = useRef<string>('');

  const handleSaveViewClick = useCallback((resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
    hasShownSaveSuggestion.current = false; // Reset when user opens save modal
  }, []);


  const {
    filteredLeads,
    searchQuery,
    user,
    isAddLeadDialogOpen,
    handleLogout,
    handleAddLead,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
    isLoading,
    isLoadingView,
    savedView, // Get savedView from useDashboardLogic instead of duplicate call
    refreshLeads,
    // Pagination state and handlers
    currentPage,
    pageSize,
    totalLeads,
    handlePageChange,
    handlePageSizeChange,
    // Sorting handlers
    sortBy,
    sortOrder,
    handleSortChange,
  } = useDashboardLogic({ filterGroup });

  // Group pagination state (separate from record pagination)
  // Use the same pageSize as regular pagination for consistency, but allow it to be changed
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize); // Start with regular page size, but allow changes

  // Sync groupPageSize with pageSize when pageSize changes
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);

  // Debug: Log filteredLeads when it changes
  useEffect(() => {
  }, [filteredLeads, isLoading]);

  // Get filter fields with dynamic options from data - now includes all renderable columns and related entities
  const leadFilterFields = useMemo(() => {
    return getLeadFilterFields(filteredLeads || [], allLeadColumns);
  }, [filteredLeads]);

  // Function to get all group keys for collapse/expand all
  const getAllGroupKeysFn = useCallback(() => {
    return getAllGroupKeys(filteredLeads || [], groupByKeys);
  }, [filteredLeads, groupByKeys]);

  // Calculate total groups when grouping is active (after filteredLeads is defined)
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !filteredLeads || filteredLeads.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredLeads, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredLeads, groupByKeys]);

  // Reset group pagination when grouping changes
  useEffect(() => {
    if (isGroupingActive) {
      setGroupCurrentPage(1);
    }
  }, [isGroupingActive, groupByKeys]);

  const handleGroupPageChange = useCallback((page: number) => {
    setGroupCurrentPage(page);
  }, []);

  const handleGroupPageSizeChange = useCallback((newPageSize: number) => {
    setGroupPageSize(newPageSize);
    setGroupCurrentPage(1); // Reset to first page when page size changes
  }, []);

  const { toast } = useToast();

  const handleBulkDelete = useCallback(
    async (payload: { ids: string[]; selectAllAcrossPages: boolean }) => {
      const idsToDelete = payload.selectAllAcrossPages
        ? await fetchLeadIdsByFilter({ searchQuery, filterGroup })
        : payload.ids;

      if (!idsToDelete.length) return;

      const chunkSize = 100;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error } = await supabase.from('leads').delete().in('id', chunk);
        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: 'הלידים נמחקו בהצלחה',
      });

      refreshLeads();
    },
    [searchQuery, filterGroup, toast, refreshLeads]
  );

  const handleBulkEdit = useCallback(
    async (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number; updates: Record<string, any> }) => {
      const idsToUpdate = payload.selectAllAcrossPages
        ? await fetchLeadIdsByFilter({ searchQuery, filterGroup })
        : payload.ids;

      if (!idsToUpdate.length || Object.keys(payload.updates).length === 0) return;

      const chunkSize = 100;
      for (let i = 0; i < idsToUpdate.length; i += chunkSize) {
        const chunk = idsToUpdate.slice(i, i + chunkSize);
        const { error } = await supabase.from('leads').update(payload.updates).in('id', chunk);
        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: `עודכנו ${idsToUpdate.length} לידים בהצלחה`,
      });

      refreshLeads();
    },
    [searchQuery, filterGroup, toast, refreshLeads]
  );

  useSyncSavedViewFilters('leads', savedView, isLoadingView);

  // Show save suggestion when filters change
  useEffect(() => {
    // Skip if we're loading a saved view or if we've already shown the suggestion
    if (isLoading || hasShownSaveSuggestion.current || viewId) {
      return;
    }

    // Create a string representation of current filters for comparison
    const currentFiltersStr = JSON.stringify({
      filters: filterGroup,
      searchQuery,
    });

    // Only show suggestion if filters have changed and we have active filters
    if (
      previousFiltersRef.current !== currentFiltersStr &&
      previousFiltersRef.current !== '' && // Don't show on initial load
      (activeFilters.length > 0 || searchQuery)
    ) {
      hasShownSaveSuggestion.current = true;
      toast({
        title: 'שמור תצוגה',
        description: 'המסננים שלך שונו. האם תרצה לשמור את התצוגה הנוכחית?',
        action: (
          <button
            onClick={() => {
              handleSaveViewClick('leads');
            }}
            className="mr-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
          >
            שמור תצוגה
          </button>
        ),
        duration: 8000,
      });
    }

    previousFiltersRef.current = currentFiltersStr;
  }, [activeFilters, filterGroup, searchQuery, isLoading, viewId, toast, handleSaveViewClick]);

  return (
    <>
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
        {/* Header Section - Control Deck - Always visible */}
        <div className="flex-shrink-0">
          <TableActionHeader
            resourceKey="leads"
            title={savedView?.view_name || 'ניהול לידים'}
            dataCount={totalLeads || 0}
            singularLabel="ליד"
            pluralLabel="לידים"
            filterFields={leadFilterFields}
            searchPlaceholder="חיפוש לפי שם, טלפון, אימייל, סטטוס, מטרה, תוכנית או כל מידע אחר..."
            addButtonLabel="הוסף ליד"
            onAddClick={handleAddLead}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={allLeadColumns}
            getAllGroupKeys={getAllGroupKeysFn}
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p>טוען נתונים...</p>
              </div>
            </div>
          ) : filteredLeads && Array.isArray(filteredLeads) && filteredLeads.length > 0 ? (
            <div className="flex-1 min-h-0">
              <LeadsDataTable
                leads={filteredLeads}
                enableColumnVisibility={false}
                onSortChange={handleSortChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                totalCount={totalLeads}
                onBulkDelete={handleBulkDelete}
                onBulkEdit={handleBulkEdit}
                singularLabel="ליד"
                pluralLabel="לידים"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                {!isLoading && totalLeads === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    מספר לידים: 0
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoading && totalLeads > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalLeads}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoading}
                singularLabel="ליד"
                pluralLabel="לידים"
              />
            </div>
          )}
        </div>

      </TableManagementLayout>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        onLeadCreated={refreshLeads}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey={saveViewResourceKey}
        filterConfig={getCurrentFilterConfig(activeFilters, columnOrder, columnSizing)}
      />
    </>
  );
};

export default Dashboard;
