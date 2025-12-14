import { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { supabase } from '@/lib/supabaseClient';
import { fetchLeads } from '@/store/slices/dashboardSlice';
import { STATUS_CATEGORIES } from './useLeadStatus';
import { toast } from '@/hooks/use-toast';

export interface AddLeadFormData {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other' | '';
  status_main: string;
  status_sub: string;
  height: number | null;
  weight: number | null;
  source: string;
  fitness_goal: string;
  activity_level: string;
  preferred_time: string;
  notes: string;
}

const initialFormData: AddLeadFormData = {
  full_name: '',
  phone: '',
  email: '',
  city: '',
  birth_date: '',
  gender: '',
  status_main: '',
  status_sub: '',
  height: null,
  weight: null,
  source: '',
  fitness_goal: '',
  activity_level: '',
  preferred_time: '',
  notes: '',
};

export const useAddLead = () => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<AddLeadFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedCategory('');
  };

  const handleInputChange = (field: keyof AddLeadFormData, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = STATUS_CATEGORIES.find((cat) => cat.id === categoryId);
    if (category) {
      setFormData((prev) => ({
        ...prev,
        status_main: category.label,
        status_sub: '', // Reset sub-status when category changes
      }));
    }
  };

  const handleSubStatusChange = (subStatusId: string) => {
    const category = STATUS_CATEGORIES.find((cat) => cat.id === selectedCategory);
    if (category?.subStatuses) {
      const subStatus = category.subStatuses.find((sub) => sub.id === subStatusId);
      if (subStatus) {
        setFormData((prev) => ({
          ...prev,
          status_sub: subStatus.label,
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    if (!formData.full_name.trim()) {
      toast({
        title: 'שגיאה',
        description: 'שם מלא הוא שדה חובה',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.phone.trim()) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון הוא שדה חובה',
        variant: 'destructive',
      });
      return false;
    }

    // Basic phone validation (Israeli format)
    const phoneRegex = /^0[2-9]\d{7,8}$/;
    const cleanPhone = formData.phone.replace(/-/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא תקין',
        variant: 'destructive',
      });
      return false;
    }

    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'שגיאה',
        description: 'כתובת אימייל לא תקינה',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = formData.phone.replace(/-/g, '').trim();
      const cleanEmail = formData.email.trim() || null;
      const cleanName = formData.full_name.trim();

      // Step 1: Check if customer exists by phone
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id, email')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let customerId: string;

      // Step 2: Handle Identity (Upsert Customer)
      if (existingCustomer) {
        // Customer exists - use existing ID
        customerId = existingCustomer.id;
        
        // Update customer with latest details (Last Write Wins)
        if (cleanEmail) {
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              full_name: cleanName,
              email: cleanEmail,
              updated_at: new Date().toISOString(),
            })
            .eq('id', customerId);

          if (updateError) throw updateError;
        } else {
          // Update name even if email is not provided
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              full_name: cleanName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', customerId);

          if (updateError) throw updateError;
        }
      } else {
        // New customer - create it
        const { data: newCustomer, error: createCustomerError } = await supabase
          .from('customers')
          .insert({
            full_name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
          })
          .select('id')
          .single();

        if (createCustomerError) {
          // Handle unique constraint violation
          if (createCustomerError.code === '23505') {
            // Phone already exists (race condition) - fetch existing
            const { data: raceCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('phone', cleanPhone)
              .single();
            
            if (raceCustomer) {
              customerId = raceCustomer.id;
            } else {
              throw createCustomerError;
            }
          } else {
            throw createCustomerError;
          }
        } else {
          customerId = newCustomer.id;
        }
      }

      // Step 3: Create Lead (wrapped in transaction via RPC or sequential with error handling)
      const leadData: any = {
        customer_id: customerId,
        city: formData.city.trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        status_main: formData.status_main || null,
        status_sub: formData.status_sub || null,
        height: formData.height || null,
        weight: formData.weight || null,
        source: formData.source || null,
        fitness_goal: formData.fitness_goal || null,
        activity_level: formData.activity_level || null,
        preferred_time: formData.preferred_time || null,
        notes: formData.notes.trim() || null,
        // Set default JSONB values
        daily_protocol: {},
        workout_history: [],
        steps_history: [],
        subscription_data: {},
      };

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (leadError) {
        console.error('Error adding lead:', leadError);
        let errorMessage = 'נכשל בהוספת הליד';
        if (leadError.message?.includes('schema cache')) {
          errorMessage = 'הטבלה לא נמצאה. אנא ודא שהמיגרציה רצה בהצלחה.';
        } else if (leadError.message?.includes('permission denied') || leadError.code === '42501') {
          errorMessage = 'אין הרשאה להוסיף ליד. אנא בדוק את מדיניות RLS.';
        } else if (leadError.message) {
          errorMessage = leadError.message;
        }
        
        toast({
          title: 'שגיאה',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'הצלחה',
        description: 'הליד נוסף בהצלחה',
      });

      // Refresh leads list
      await dispatch(fetchLeads());

      // Reset form (dialog will be closed by parent component)
      resetForm();
    } catch (err: any) {
      console.error('Unexpected error adding lead:', err);
      toast({
        title: 'שגיאה',
        description: err?.message || 'אירעה שגיאה בלתי צפויה',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryData = STATUS_CATEGORIES.find((cat) => cat.id === selectedCategory);
  const hasSubStatuses = selectedCategoryData?.subStatuses && selectedCategoryData.subStatuses.length > 0;

  return {
    formData,
    isSubmitting,
    selectedCategory,
    selectedCategoryData,
    hasSubStatuses,
    handleInputChange,
    handleCategoryChange,
    handleSubStatusChange,
    handleSubmit,
    resetForm,
  };
};

