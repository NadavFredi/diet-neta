import React, { useEffect, useState } from 'react';
import { useEntityQuery } from '@/hooks/useEntityQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';

import { useNavigate } from 'react-router-dom';

const LeadsRefactored = () => {
  const navigate = useNavigate();
  const { config, data, count, isLoading, error, fetchData } = useEntityQuery('leads');
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const pageSize = 20;

  // Initial load
  useEffect(() => {
    fetchData({ page, pageSize, filters: activeFilters });
  }, [config, page, activeFilters]);

  const handleFilterChange = (fieldId: string, operator: string, value: string) => {
    setPage(1);
    setActiveFilters(prev => {
      // Remove existing filter for this field to avoid duplicates for now (simple implementation)
      const others = prev.filter(f => f.field !== fieldId);
      if (!value || value === 'all') return others;
      return [...others, { field: fieldId, operator, value }];
    });
  };

  const getFilterValue = (fieldId: string) => {
    return activeFilters.find(f => f.field === fieldId)?.value || '';
  };

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8 space-y-6 dir-rtl" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול לידים (ארכיטקטורה חדשה)</h1>
        <div className="flex items-center gap-2">
           <Badge variant="outline">Schema Driven UI</Badge>
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">סינון</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap gap-4">
             {config?.filters.map((filter: any) => (
               <div key={filter.id} className="w-[200px]">
                 <Label className="mb-1 block text-xs">{filter.label}</Label>
                 
                 {filter.type === 'select' && filter.options?.length > 0 ? (
                   <Select 
                      value={getFilterValue(filter.id)} 
                      onValueChange={(val) => handleFilterChange(filter.id, 'eq', val)}
                   >
                    <SelectTrigger>
                      <SelectValue placeholder={`בחר ${filter.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      {filter.options.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                 ) : (
                    // Default to text input for others
                    <Input 
                      placeholder={`חפש ${filter.label}...`}
                      value={getFilterValue(filter.id)}
                      onChange={(e) => handleFilterChange(filter.id, filter.operators[0], e.target.value)}
                    />
                 )}
               </div>
             ))}
             
             {activeFilters.length > 0 && (
               <div className="flex items-end">
                 <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])} className="text-red-500">
                   <X className="w-4 h-4 ml-1" />
                   נקה סינון
                 </Button>
               </div>
             )}
           </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading && !data.length ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {config?.columns
                      .filter((col: any) => col.visible)
                      .map((col: any) => (
                      <TableHead key={col.id} className="text-right">{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={config?.columns.length || 1} className="text-center h-32 text-gray-500">
                        לא נמצאו תוצאות
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row: any) => (
                      <TableRow 
                        key={row.id} 
                        className="cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => navigate(`/leads/${row.id}`)}
                      >
                        {config?.columns
                          .filter((col: any) => col.visible)
                          .map((col: any) => (
                          <TableCell key={`${row.id}-${col.id}`}>
                             {col.type === 'badge' ? (
                               <Badge variant="secondary">{row[col.id]}</Badge>
                             ) : col.id === 'created_at' ? (
                               new Date(row[col.id]).toLocaleDateString('he-IL')
                             ) : (
                               row[col.id]
                             )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-4">
             <div className="text-sm text-gray-500">
                מציג {(page - 1) * pageSize + 1} עד {Math.min(page * pageSize, count)} מתוך {count} תוצאות
             </div>
             <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 disabled={page === 1 || isLoading}
                 onClick={() => setPage(p => Math.max(1, p - 1))}
               >
                 הקודם
               </Button>
               <Button 
                 variant="outline"
                 disabled={page * pageSize >= count || isLoading}
                 onClick={() => setPage(p => p + 1)}
               >
                 הבא
               </Button>
             </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsRefactored;