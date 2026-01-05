import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { Lead, SubscriptionInfo, WorkoutProgram, StepsHistory } from '@/store/slices/dashboardSlice';

// Helper functions (duplicated from dashboardSlice since they're not exported)
function formatDateString(date: string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const useLeadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  // Fetch lead with customer JOIN
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id, user?.email],
    queryFn: async () => {
      if (!id || !user?.email) return null;

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Map to UI format (inline mapping since mapDBLeadToUILead is not exported)
      const customer = data.customer;
      if (!customer) {
        throw new Error('Customer data is required for lead');
      }

      const dailyProtocol = data.daily_protocol || {};
      const subscriptionData = data.subscription_data || {};
      const workoutHistory = (data.workout_history || []).map((workout: any) => ({
        programName: workout.name || '',
        startDate: workout.startDate ? formatDateString(workout.startDate) : '',
        validUntil: workout.validUntil ? formatDateString(workout.validUntil) : '',
        duration: workout.duration || '',
        description: workout.description || '',
        strengthCount: workout.split?.strength || workout.strengthCount || 0,
        cardioCount: workout.split?.cardio || workout.cardioCount || 0,
        intervalsCount: workout.split?.intervals || workout.intervalsCount || 0,
      }));
      const stepsHistory = (data.steps_history || []).map((step: any) => ({
        weekNumber: step.weekNumber || step.week || '',
        startDate: step.startDate ? formatDateString(step.startDate) : step.dates || '',
        endDate: step.endDate ? formatDateString(step.endDate) : '',
        target: step.target || 0,
      }));

      return {
        id: data.id,
        name: customer.full_name,
        createdDate: formatDateString(data.created_at),
        status: data.status_main || 'חדש',
        phone: customer.phone,
        email: customer.email || '',
        source: data.source || '',
        age: calculateAge(data.birth_date),
        birthDate: data.birth_date ? formatDateString(data.birth_date) : '',
        height: data.height || 0,
        weight: data.weight || 0,
        fitnessGoal: data.fitness_goal || '',
        activityLevel: data.activity_level || '',
        preferredTime: data.preferred_time || '',
        notes: data.notes || undefined,
        dailyStepsGoal: dailyProtocol.stepsGoal || 0,
        weeklyWorkouts: dailyProtocol.workoutGoal || 0,
        dailySupplements: dailyProtocol.supplements || [],
        subscription: {
          joinDate: data.join_date ? formatDateString(data.join_date) : '',
          initialPackageMonths: subscriptionData.months || 0,
          initialPrice: subscriptionData.initialPrice || 0,
          monthlyRenewalPrice: subscriptionData.renewalPrice || 0,
          currentWeekInProgram: subscriptionData.currentWeekInProgram || 0,
          timeInCurrentBudget: subscriptionData.timeInCurrentBudget || '',
        },
        workoutProgramsHistory: workoutHistory,
        stepsHistory,
        customerId: customer.id,
      } as Lead;
    },
    enabled: !!id && !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCall = () => {
    if (lead?.phone) {
      window.location.href = `tel:${lead.phone.replace(/-/g, '')}`;
    }
  };

  const handleWhatsApp = () => {
    if (lead?.phone) {
      const phoneNumber = lead.phone.replace(/-/g, '').replace(/^0/, '972');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (lead?.email) {
      window.location.href = `mailto:${lead.email}`;
    }
  };

  // Calculate BMI: weight (kg) / (height (m))^2
  const calculateBMI = (height: number, weight: number): number => {
    const heightInMeters = height / 100;
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const bmi = lead ? calculateBMI(lead.height, lead.weight) : 0;

  return {
    lead,
    isLoading,
    bmi,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
  };
};









