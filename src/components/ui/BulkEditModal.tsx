import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from './DataTable';

interface FieldValuePair {
    id: string;
    field: string;
    value: string;
}

interface BulkEditModalProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (updates: Record<string, any>) => Promise<void> | void;
    columns: DataTableColumn<T>[];
    selectedCount: number;
    totalItems: number;
    selectAllAcrossPages: boolean;
    selectionLabel: string;
    isEditing?: boolean;
    dir?: 'ltr' | 'rtl';
}

export function BulkEditModal<T extends Record<string, any>>({
    open,
    onOpenChange,
    onConfirm,
    columns,
    selectedCount,
    totalItems,
    selectAllAcrossPages,
    selectionLabel,
    isEditing = false,
    dir = 'rtl',
}: BulkEditModalProps<T>) {
    // Get editable columns (exclude selection column and columns without accessorKey)
    const editableColumns = columns.filter((col) => {
        if (col.id === '__select__') return false;
        if (!col.accessorKey && !col.accessorFn) return false;
        return true;
    });

    const [pairs, setPairs] = useState<FieldValuePair[]>([
        { id: '1', field: '', value: '' },
    ]);

    const addPair = () => {
        setPairs([...pairs, { id: Date.now().toString(), field: '', value: '' }]);
    };

    const removePair = (id: string) => {
        if (pairs.length > 1) {
            setPairs(pairs.filter((p) => p.id !== id));
        }
    };

    const updatePair = (id: string, updates: Partial<FieldValuePair>) => {
        setPairs(pairs.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    };

    // Helper to get the actual field name (accessorKey) from column ID
    const getFieldNameFromColumnId = (columnId: string): string | null => {
        const column = editableColumns.find((col) => col.id === columnId);
        if (!column) return null;
        // Use accessorKey if available, otherwise fall back to column id
        return column.accessorKey ? String(column.accessorKey) : column.id;
    };

    const handleConfirm = async () => {
        // Build updates object from pairs
        const updates: Record<string, any> = {};

        pairs.forEach((pair) => {
            if (pair.field) {
                // pair.field is the column ID, we need to get the actual field name
                const fieldName = getFieldNameFromColumnId(pair.field);
                if (fieldName) {
                    // Convert empty strings to null for optional fields
                    updates[fieldName] = pair.value === '' ? null : pair.value;
                }
            }
        });

        if (Object.keys(updates).length === 0) {
            return;
        }

        await onConfirm(updates);

        // Reset form
        setPairs([{ id: '1', field: '', value: '' }]);
    };

    const handleCancel = () => {
        setPairs([{ id: '1', field: '', value: '' }]);
        onOpenChange(false);
    };

    // Get used fields to prevent duplicates (using column IDs)
    const usedFields = pairs.map((p) => p.field).filter(Boolean);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent dir={dir}>
                <DialogHeader>
                    <DialogTitle>עריכה מרוכזת</DialogTitle>
                    <DialogDescription>
                        {selectAllAcrossPages
                            ? `את/ה עומד/ת לערוך ${totalItems} ${selectionLabel}.`
                            : `את/ה עומד/ת לערוך ${selectedCount} ${selectionLabel}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto" >
                    {pairs.map((pair, index) => (
                        <div
                            key={pair.id}
                            className={cn(
                                'flex gap-2 items-end',
                                'flex-row'
                            )}
                        >
                            <div className="flex-1 space-y-2">
                                <Label htmlFor={`field-${pair.id}`}>
                                    שדה {index + 1}
                                </Label>
                                <Select
                                    value={pair.field}
                                    onValueChange={(value) => updatePair(pair.id, { field: value })}
                                >
                                    <SelectTrigger id={`field-${pair.id}`}>
                                        <SelectValue placeholder="בחר שדה" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {editableColumns.map((col) => {
                                            const headerText =
                                                typeof col.header === 'string' ? col.header : col.id;
                                            // Use column ID as the value to ensure uniqueness
                                            const columnId = col.id;
                                            const isUsed = usedFields.includes(columnId) && pair.field !== columnId;

                                            return (
                                                <SelectItem
                                                    key={col.id}
                                                    value={columnId}
                                                    disabled={isUsed}
                                                >
                                                    {headerText}
                                                    {isUsed && ' (בשימוש)'}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor={`value-${pair.id}`}>
                                    ערך {index + 1}
                                </Label>
                                <Input
                                    id={`value-${pair.id}`}
                                    value={pair.value}
                                    onChange={(e) => updatePair(pair.id, { value: e.target.value })}
                                    placeholder="הזן ערך חדש"
                                />
                            </div>
                            <div className="flex gap-1">
                                {pairs.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => removePair(pair.id)}
                                        className="h-10 w-10"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                {index === pairs.length - 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={addPair}
                                        className="h-10 w-10"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isEditing}
                    >
                        ביטול
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={
                            isEditing ||
                            pairs.every((p) => !p.field) ||
                            pairs.some((p) => p.field && p.value === undefined)
                        }
                    >
                        {isEditing ? 'מעדכן...' : 'אישור'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
