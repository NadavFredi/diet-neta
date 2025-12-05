import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { Lead } from '@/store/slices/dashboardSlice';

export const useLeadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leads = useAppSelector((state) => state.dashboard.leads);

  const lead: Lead | undefined = leads.find((l) => l.id === id);

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
    bmi,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
  };
};

