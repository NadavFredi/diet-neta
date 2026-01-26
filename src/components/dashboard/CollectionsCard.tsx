/**
 * CollectionsCard Component
 * 
 * Displays collections (גבייה) for a lead/customer with ability to create new ones.
 */

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus, Calendar, Trash2 } from 'lucide-react';
import { useCollectionsByLead } from '@/hooks/useCollectionsByLead';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { AddCollectionDialog } from './dialogs/AddCollectionDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface CollectionsCardProps {
  leadId: string | null;
  customerId?: string | null;
}

export const CollectionsCard: React.FC<CollectionsCardProps> = ({
  leadId,
  customerId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: collections = [], isLoading } = useCollectionsByLead(leadId);
  const { data: paymentHistory = [] } = usePaymentHistory(customerId || '', leadId || null);

  // Get unlinked payments (payments without a collection_id)
  const unlinkedPayments = useMemo(() => {
    return paymentHistory.filter((payment) => !payment.collection_id);
  }, [paymentHistory]);

  // Calculate remaining amount for each collection
  const collectionsWithRemaining = useMemo(() => {
    return collections.map((collection) => {
      const linkedPayments = paymentHistory.filter(
        (payment) => payment.collection_id === collection.id
      );
      const paidAmount = linkedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const remaining = Math.max(0, collection.total_amount - paidAmount);
      return {
        ...collection,
        paidAmount,
        remaining,
      };
    });
  }, [collections, paymentHistory]);

  // Sort collections by date (most recent first)
  const sortedCollections = useMemo(() => {
    return [...collectionsWithRemaining].sort((a, b) => {
      const dateA = a.due_date || a.created_at;
      const dateB = b.due_date || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [collectionsWithRemaining]);

  const handleCreateCollection = () => {
    setIsAddDialogOpen(true);
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/dashboard/collections/${collectionId}`, {
      state: { returnTo: location.pathname + location.search }
    });
  };

  const handleCollectionToggle = (collectionId: string, checked: boolean) => {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(collectionId);
      } else {
        next.delete(collectionId);
      }
      return next;
    });
  };

  const handleSelectAllCollections = (checked: boolean) => {
    if (checked) {
      setSelectedCollections(new Set(sortedCollections.map((c) => c.id)));
    } else {
      setSelectedCollections(new Set());
    }
  };

  const handleDeleteCollections = async () => {
    if (selectedCollections.size === 0) return;

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .in('id', Array.from(selectedCollections));

      if (error) throw error;

      setSelectedCollections(new Set());
      setIsDeleteDialogOpen(false);

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['collections-by-lead'] });
      queryClient.invalidateQueries({ queryKey: ['all-collections'] });

      toast({
        title: 'הצלחה',
        description: `נמחקו ${selectedCollections.size} גביות בהצלחה`,
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הגביות',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ממתין':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'חלקי':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'הושלם':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'בוטל':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  if (!leadId) {
    return null;
  }

  return (
    <>
      <Card className="p-4 sm:p-6 border border-slate-100 rounded-lg sm:rounded-xl shadow-md bg-white flex flex-col h-full">
        <div className="pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100">
                <Receipt className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">גביות</h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedCollections.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  מחק ({selectedCollections.size})
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleCreateCollection}
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                צור גבייה
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto max-h-[300px]">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm">טוען גביות...</p>
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>אין גביות</p>
            </div>
          ) : (
            <>
              {sortedCollections.length > 0 && (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right w-12"></TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right">תאריך</TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right">סטטוס</TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right">סכום</TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right">נותר</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCollections.map((collection) => (
                      <TableRow
                        key={collection.id}
                        onClick={() => handleCollectionClick(collection.id)}
                        className="cursor-pointer hover:bg-purple-50 transition-colors border-b border-gray-100"
                      >
                        <TableCell
                          className="text-xs py-3 px-3 text-right align-middle w-12"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCollections.has(collection.id)}
                            onCheckedChange={(checked) => handleCollectionToggle(collection.id, checked === true)}
                          />
                        </TableCell>
                        <TableCell className="text-xs py-3 px-3 text-gray-900 text-right align-middle">
                          {collection.due_date
                            ? format(new Date(collection.due_date), 'dd/MM/yyyy', { locale: he })
                            : format(new Date(collection.created_at), 'dd/MM/yyyy', { locale: he })
                          }
                        </TableCell>
                        <TableCell className="text-xs py-3 px-3 text-right align-middle">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 inline-flex", getStatusColor(collection.status || 'ממתין'))}>
                            {collection.status || 'ממתין'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-3 px-3 text-gray-900 font-semibold text-right align-middle">
                          {formatCurrency(collection.total_amount)}
                        </TableCell>
                        <TableCell className="text-xs py-3 px-3 text-gray-700 text-right align-middle">
                          {formatCurrency(collection.remaining)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      </Card>

      <AddCollectionDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        leadId={leadId}
        onCollectionCreated={() => {
          // Collections will refresh automatically via query invalidation
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת גביות</AlertDialogTitle>
            <AlertDialogDescription>
              את/ה עומד/ת למחוק {selectedCollections.size} גביות. פעולה זו אינה ניתנת לשחזור.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollections}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
