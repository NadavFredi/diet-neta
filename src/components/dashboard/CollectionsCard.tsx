/**
 * CollectionsCard Component
 * 
 * Displays collections (גבייה) for a lead/customer with ability to create new ones.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus, Calendar, DollarSign } from 'lucide-react';
import { useCollectionsByLead } from '@/hooks/useCollectionsByLead';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { AddCollectionDialog } from './dialogs/AddCollectionDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CollectionsCardProps {
  leadId: string | null;
  customerId?: string | null;
}

export const CollectionsCard: React.FC<CollectionsCardProps> = ({
  leadId,
  customerId,
}) => {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: collections = [], isLoading } = useCollectionsByLead(leadId);
  const { data: allPayments = [] } = usePaymentHistory(customerId || '', leadId || null);

  // Get payments not linked to any collection
  const unlinkedPayments = allPayments.filter((p) => !p.collection_id);

  const handleCreateCollection = () => {
    setIsAddDialogOpen(true);
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/dashboard/collections?collection_id=${collectionId}`);
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
              <h3 className="text-sm font-bold text-gray-900">גבייות</h3>
            </div>
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

        <div className="flex-1 overflow-auto max-h-[300px] mt-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm">טוען גבייות...</p>
            </div>
          ) : collections.length === 0 && unlinkedPayments.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">אין גבייות עדיין</p>
            </div>
          ) : (
            <>
              {/* Collections List */}
              {collections.length > 0 && (
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      onClick={() => handleCollectionClick(collection.id)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={cn(
                                'text-xs font-semibold px-2 py-0.5 border',
                                getStatusColor(collection.status || 'ממתין')
                              )}
                            >
                              {collection.status || 'ממתין'}
                            </Badge>
                            {collection.description && (
                              <span className="text-sm font-medium text-slate-900">
                                {collection.description}
                              </span>
                            )}
                          </div>
                          {collection.due_date && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(new Date(collection.due_date), 'dd/MM/yyyy', { locale: he })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(collection.total_amount)}
                          </div>
                          {collection.paid_amount !== undefined && (
                            <div className="text-xs text-slate-500">
                              שולם: {formatCurrency(collection.paid_amount)}
                            </div>
                          )}
                          {collection.remaining_amount !== undefined && collection.remaining_amount > 0 && (
                            <div className="text-xs text-red-600 font-semibold">
                              נותר: {formatCurrency(collection.remaining_amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unlinked Payments Section */}
              {unlinkedPayments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-600 mb-2">
                    תשלומים ללא גבייה ({unlinkedPayments.length})
                  </div>
                  <div className="space-y-1.5">
                    {unlinkedPayments.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded"
                      >
                        <span className="text-slate-700 text-right flex-1">{payment.product_name || 'ללא שם מוצר'}</span>
                        <span className="font-semibold text-slate-900 text-right flex-shrink-0 mr-2">
                          {formatCurrency(payment.amount || 0)}
                        </span>
                      </div>
                    ))}
                    {unlinkedPayments.length > 3 && (
                      <div className="text-xs text-slate-500 text-center pt-1">
                        +{unlinkedPayments.length - 3} תשלומים נוספים
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <AddCollectionDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        leadId={leadId}
        customerId={customerId}
        onCollectionCreated={() => {
          // Collections will refresh automatically via query invalidation
        }}
      />
    </>
  );
};
