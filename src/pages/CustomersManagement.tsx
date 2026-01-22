/**
 * CustomersManagement UI Component
 * 
 * Pure presentation component - all logic is in CustomersManagement.ts
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { CustomersDataTable } from '@/components/dashboard/CustomersDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { Pagination } from '@/components/dashboard/Pagination';
import { useAppSelector } from '@/store/hooks';
import { getCustomerFilterFields } from '@/hooks/useTableFilters';
import { customerColumns } from '@/components/dashboard/columns/customerColumns';
import { useCustomersManagement } from './CustomersManagement';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { selectActiveFilters, selectGroupByKeys } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount, type MultiLevelGroupedData } from '@/utils/groupDataByKey';

const CustomersManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();
  const hasShownSaveSuggestion = useRef(false);
  const previousFiltersRef = useRef<string>('');
  
  const {
    customers,
    savedView,
    isLoadingCustomers,
    isLoadingView,
    isSaveViewModalOpen,
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
    searchQuery,
    filteredCustomers,
    totalCustomers,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    handleBulkDelete,
  } = useCustomersManagement();

  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'customers'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'customers'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Group pagination state (separate from record pagination)
  // Use the same pageSize as regular pagination for consistency, but allow it to be changed
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize); // Start with regular page size, but allow changes
  
  // Sync groupPageSize with pageSize when pageSize changes
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);
  
  // Calculate total groups when grouping is active
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !filteredCustomers || filteredCustomers.length === 0) {
      return 0;
    }
    
    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredCustomers, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredCustomers, groupByKeys]);
  
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

  // Generate filter fields with all renderable columns
  const customerFilterFields = useMemo(() => {
    return getCustomerFilterFields(filteredCustomers || customers || [], customerColumns);
  }, [filteredCustomers, customers]);

  // Load advanced filters from saved view
  useEffect(() => {
    if (viewId && savedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as any;
      if (filterConfig.advancedFilters && Array.isArray(filterConfig.advancedFilters)) {
        // Convert saved advanced filters to ActiveFilter format
        previousFiltersRef.current = JSON.stringify({
          filters: filterConfig.advancedFilters || [],
          searchQuery: filterConfig.searchQuery || '',
        });
        hasShownSaveSuggestion.current = false; // Reset when loading saved view
      }
    } else if (!viewId) {
      // Clear filters when no view is selected
      previousFiltersRef.current = '';
      hasShownSaveSuggestion.current = false;
    }
  }, [viewId, savedView, isLoadingView]);

  // Show save suggestion when filters change
  useEffect(() => {
    // Skip if we're loading or if we've already shown the suggestion
    if (isLoadingCustomers || hasShownSaveSuggestion.current || viewId) {
      return;
    }

    // Create a string representation of current filters for comparison
    const currentFiltersStr = JSON.stringify({
      filters: activeFilters,
      searchQuery: searchQuery || '',
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
              handleSaveViewClick();
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
  }, [activeFilters, searchQuery, isLoadingCustomers, viewId, toast, handleSaveViewClick]);

  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  const handleAddLead = useCallback(() => {
    setIsAddLeadDialogOpen(true);
  }, []);

  const handleLeadCreated = useCallback(() => {
    // Refresh customers data after a lead is created
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    setIsAddLeadDialogOpen(false);
  }, [queryClient]);

  return (
    <>
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
        {/* Header Section - Always visible */}
        <div className="flex-shrink-0">
          <TableActionHeader
            resourceKey="customers"
            title={savedView?.view_name || 'ניהול לקוחות'}
            dataCount={totalCustomers || 0}
            singularLabel="לקוח"
            pluralLabel="לקוחות"
            filterFields={customerFilterFields}
            searchPlaceholder="חיפוש לפי שם, טלפון או אימייל..."
            addButtonLabel="הוסף ליד"
            onAddClick={handleAddLead}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={customerColumns}
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoadingCustomers ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">טוען לקוחות...</p>
              </div>
            </div>
          ) : filteredCustomers && Array.isArray(filteredCustomers) && filteredCustomers.length > 0 ? (
            <div className="flex-1 min-h-0">
              <CustomersDataTable 
                customers={filteredCustomers} 
                onBulkDelete={handleBulkDelete}
                groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                groupPageSize={isGroupingActive ? groupPageSize : undefined}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו לקוחות</p>
                <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                {!isLoadingCustomers && (
                  <p className="text-xs text-gray-400 mt-2">
                    {filteredCustomers && Array.isArray(filteredCustomers)
                      ? `מספר לקוחות: ${filteredCustomers.length}`
                      : 'אין נתונים זמינים'}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoadingCustomers && totalCustomers > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                pageSize={isGroupingActive ? groupPageSize : pageSize}
                totalItems={isGroupingActive ? totalGroups : totalCustomers}
                onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                onPageSizeChange={isGroupingActive ? handleGroupPageSizeChange : handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoadingCustomers}
                singularLabel="לקוח"
                pluralLabel="לקוחות"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        onLeadCreated={handleLeadCreated}
      />

      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="customers"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

    </>
  );
};

export default CustomersManagement;
