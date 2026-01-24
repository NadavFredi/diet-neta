import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplementItem } from '@/hooks/useSupplementTemplates';

const supplementItemSchema = z.object({
  name: z.string().min(1, 'שם התוסף הוא חובה'),
  link1: z.string().url('קישור לא תקין').optional().or(z.literal('')),
  link2: z.string().url('קישור לא תקין').optional().or(z.literal('')),
});

const formSchema = z.object({
  name: z.string().min(1, 'שם התבנית הוא חובה'),
  description: z.string().optional(),
  supplements: z.array(supplementItemSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface SupplementTemplateFormProps {
  initialData?: {
    name: string;
    description?: string | null;
    supplements: SupplementItem[];
  };
  onSave: (data: FormValues) => void;
  onCancel: () => void;
}

export const SupplementTemplateForm = ({
  initialData,
  onSave,
  onCancel,
}: SupplementTemplateFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      supplements: initialData?.supplements || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'supplements',
  });

  const handleSubmit = (data: FormValues) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 h-full flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>פרטי התבנית</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם התבנית</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: תוספים לחיטוב" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תיאור</FormLabel>
                    <FormControl>
                      <Textarea placeholder="תיאור קצר של התבנית..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>רשימת תוספים</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', link1: '', link2: '' })}
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף תוסף
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  אין תוספים ברשימה. לחץ על "הוסף תוסף" כדי להתחיל.
                </div>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start border p-4 rounded-lg bg-gray-50">
                  <div className="flex-1 space-y-4">
                    <FormField
                      control={form.control}
                      name={`supplements.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>שם התוסף</FormLabel>
                          <FormControl>
                            <Input placeholder="שם התוסף" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`supplements.${index}.link1`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <LinkIcon className="h-3 w-3" /> קישור 1
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} dir="ltr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`supplements.${index}.link2`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <LinkIcon className="h-3 w-3" /> קישור 2
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} dir="ltr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button type="submit">
            שמור תבנית
          </Button>
        </div>
      </form>
    </Form>
  );
};
