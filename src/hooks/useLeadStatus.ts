import { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateLeadStatus } from '@/store/slices/dashboardSlice';

export interface StatusCategory {
  id: string;
  label: string;
  subStatuses?: StatusSubCategory[];
}

export interface StatusSubCategory {
  id: string;
  label: string;
}

// Status hierarchy data structure
export const STATUS_CATEGORIES: StatusCategory[] = [
  {
    id: 'advanced',
    label: 'מתקדמת לתהליך',
  },
  {
    id: 'not-relevant',
    label: 'לא רלוונטי',
    subStatuses: [
      { id: 'too-expensive', label: 'יקר לי' },
      { id: 'not-good-fit', label: 'חוסר התאמה' },
      { id: 'doesnt-believe', label: 'לא מאמינה במוצר' },
      { id: 'fear', label: 'פחד' },
      { id: 'not-right-time', label: 'לא הזמן המתאים' },
    ],
  },
  {
    id: 'follow-up',
    label: 'פולואפ',
    subStatuses: [
      { id: 'initial', label: 'ראשוני' },
      { id: 'qualitative', label: 'איכותי' },
    ],
  },
];

export const useLeadStatus = (leadId: string | undefined, currentStatus: string) => {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubStatus, setSelectedSubStatus] = useState<string>('');

  // Parse current status to determine selected category and sub-status
  const parseCurrentStatus = () => {
    // First, check if current status matches any sub-status label
    for (const category of STATUS_CATEGORIES) {
      if (category.subStatuses) {
        const subStatus = category.subStatuses.find((sub) => sub.label === currentStatus);
        if (subStatus) {
          setSelectedCategory(category.id);
          setSelectedSubStatus(subStatus.id);
          return;
        }
      }
    }

    // Then check if current status matches any category label
    const category = STATUS_CATEGORIES.find((cat) => cat.label === currentStatus);
    if (category) {
      setSelectedCategory(category.id);
      setSelectedSubStatus('');
      return;
    }

    // Default to first category if no match (for legacy statuses)
    if (STATUS_CATEGORIES.length > 0) {
      setSelectedCategory(STATUS_CATEGORIES[0].id);
      setSelectedSubStatus('');
    }
  };

  const handleOpen = () => {
    parseCurrentStatus();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedCategory('');
    setSelectedSubStatus('');
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubStatus(''); // Reset sub-status when category changes
  };

  const handleSubStatusChange = (subStatusId: string) => {
    setSelectedSubStatus(subStatusId);
  };

  const handleSave = () => {
    if (!leadId || !selectedCategory) return;

    const category = STATUS_CATEGORIES.find((cat) => cat.id === selectedCategory);
    if (!category) return;

    let newStatus: string;

    // If category has sub-statuses and one is selected, use sub-status label
    if (category.subStatuses && selectedSubStatus) {
      const subStatus = category.subStatuses.find((sub) => sub.id === selectedSubStatus);
      newStatus = subStatus ? subStatus.label : category.label;
    } else {
      // Otherwise use category label
      newStatus = category.label;
    }

    dispatch(updateLeadStatus({ leadId, status: newStatus }));
    handleClose();
  };

  const selectedCategoryData = STATUS_CATEGORIES.find((cat) => cat.id === selectedCategory);
  const hasSubStatuses = selectedCategoryData?.subStatuses && selectedCategoryData.subStatuses.length > 0;

  return {
    isOpen,
    selectedCategory,
    selectedSubStatus,
    handleOpen,
    handleClose,
    handleCategoryChange,
    handleSubStatusChange,
    handleSave,
    hasSubStatuses,
    selectedCategoryData,
  };
};

