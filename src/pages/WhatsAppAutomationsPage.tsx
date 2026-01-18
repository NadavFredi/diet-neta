/**
 * WhatsApp Automations Page UI Component
 * 
 * Pure presentation component - all logic is in WhatsAppAutomationsPage.ts
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Send, Plus, Loader2 } from 'lucide-react';
import { TemplateEditorModal } from '@/components/dashboard/TemplateEditorModal';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { WhatsAppAutomationsDataTable } from '@/components/dashboard/WhatsAppAutomationsDataTable';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';
import { useWhatsAppAutomationsPage } from './WhatsAppAutomationsPage';
import { createWhatsAppAutomationColumns } from '@/components/dashboard/columns/whatsappAutomationColumns';

export const WhatsAppAutomationsPage: React.FC = () => {
  const sidebarWidth = useSidebarWidth();
  const { user } = useAppSelector((state) => state.auth);
  
  const {
    automations,
    isLoading,
    allFlows,
    editingFlowKey,
    deletingFlowKey,
    isAddDialogOpen,
    newFlowLabel,
    newFlowKey,
    flowConfig,
    editingTemplate,
    editingButtons,
    editingMedia,
    handleLogout,
    handleSaveTemplate,
    handleAddAutomation,
    handleDeleteAutomation,
    handleEdit,
    handleDelete,
    handleLabelChange,
    setEditingFlowKey,
    setDeletingFlowKey,
    setIsAddDialogOpen,
    setNewFlowLabel,
    setNewFlowKey,
  } = useWhatsAppAutomationsPage();

  // Create columns for TableActionHeader (needed for column visibility)
  // Note: Action handlers will be passed to WhatsAppAutomationsDataTable component
  const columns = React.useMemo(
    () => createWhatsAppAutomationColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete]
  );

  if (isLoading) {
    return (
      <div className="bg-gray-50 flex flex-col min-h-screen" dir="rtl">
        <DashboardHeader
          userEmail={user?.email}
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar />}
        />
        <div className="flex-1 flex items-center justify-center" style={{ marginRight: `${sidebarWidth.width}px` }}>
          <div className="text-center">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-[#5B6FB9] mb-2" />
            <p className="text-sm text-gray-600">טוען אוטומציות...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar />}
      />

      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
        <main
          className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out"
          style={{
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <div className="p-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <TableActionHeader
                resourceKey="whatsapp_automations"
                title="אוטומציית WhatsApp"
                icon={Send}
                dataCount={automations?.length || 0}
                singularLabel="אוטומציה"
                pluralLabel="אוטומציות"
                filterFields={[]}
                searchPlaceholder="חיפוש לפי שם אוטומציה..."
                addButtonLabel="הוסף אוטומציה"
                onAddClick={() => setIsAddDialogOpen(true)}
                enableColumnVisibility={true}
                enableFilters={false}
                enableGroupBy={false}
                enableSearch={true}
                columns={columns}
              />

              <div className="bg-white">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-600">טוען אוטומציות...</p>
                  </div>
                ) : automations && Array.isArray(automations) && automations.length > 0 ? (
                  <WhatsAppAutomationsDataTable
                    automations={automations}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">לא נמצאו אוטומציות</p>
                    <p className="text-sm">לחץ על "הוסף אוטומציה" כדי להתחיל</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Template Editor Modal */}
      {editingFlowKey && flowConfig && (
        <TemplateEditorModal
          isOpen={!!editingFlowKey}
          onOpenChange={(open) => !open && setEditingFlowKey(null)}
          flowKey={editingFlowKey}
          flowLabel={flowConfig.label}
          initialTemplate={editingTemplate}
          initialButtons={editingButtons}
          initialMedia={editingMedia}
          onSave={(template, buttons, media, label) => handleSaveTemplate(editingFlowKey, template, buttons, media, label)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingFlowKey && (
        <AlertDialog open={!!deletingFlowKey} onOpenChange={(open) => !open && setDeletingFlowKey(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת אוטומציה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק את האוטומציה "{allFlows.find(f => f.key === deletingFlowKey)?.label}"?
                <br />
                פעולה זו תמחק גם את התבנית הקשורה לאוטומציה זו ולא ניתן לבטל אותה.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteAutomation(deletingFlowKey!)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add Automation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>הוסף אוטומציה חדשה</DialogTitle>
            <DialogDescription>
              צור אוטומציה חדשה לשליחת הודעות WhatsApp אוטומטיות
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="flow-label">שם האוטומציה</Label>
              <Input
                id="flow-label"
                value={newFlowLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="לדוגמה: שליחת תזכורת שבועית"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                מפתח האוטומציה ייווצר אוטומטית מהשם
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewFlowLabel('');
                setNewFlowKey('');
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleAddAutomation}>
              הוסף אוטומציה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
