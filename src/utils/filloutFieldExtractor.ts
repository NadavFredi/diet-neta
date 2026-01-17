/**
 * Fillout Field Extractor Utility
 * 
 * Extracts lead fields from Fillout form submission data
 * Used for both automatic webhook updates and manual updates from UI
 */

import type { FilloutSubmission } from '@/services/filloutService';

export interface ExtractedLeadFields {
  period?: boolean | null;
  age?: number | null;
  email?: string | null;
  height?: number | null;
  weight?: number | null;
}

/**
 * Extract lead fields from Fillout form submission
 * Supports form ID 23ggw4DEs7us (questionnaire form)
 */
export function extractLeadFieldsFromSubmission(
  submission: FilloutSubmission | null,
  formId?: string
): ExtractedLeadFields {
  const extracted: ExtractedLeadFields = {};
  
  if (!submission || !submission.questions) {
    return extracted;
  }

  // Check if this is the questionnaire form
  const questionnaireFormId = '23ggw4DEs7us';
  if (formId && formId.trim().toLowerCase() !== questionnaireFormId.trim().toLowerCase()) {
    return extracted; // Not the questionnaire form
  }

  // Build a map of all question values for easy lookup
  const questionMap: Record<string, any> = {};
  submission.questions.forEach((question) => {
    const key = (question.name || question.id || '').toLowerCase();
    if (key && question.value !== undefined && question.value !== null && question.value !== '') {
      questionMap[key] = question.value;
    }
  });

  // Helper function to find field value by multiple possible field names
  const findFieldValue = (possibleNames: string[]): any => {
    for (const name of possibleNames) {
      // Try exact match
      const lowerName = name.toLowerCase();
      for (const key in questionMap) {
        if (key === lowerName || key.includes(lowerName) || lowerName.includes(key)) {
          return questionMap[key];
        }
      }
    }
    return null;
  };

  // Extract period (מקבלת מחזור) - boolean field
  const periodValue = findFieldValue([
    'period',
    'מקבלת מחזור',
    'menstrual_period',
    'menstrualPeriod',
    'has_period',
    'hasPeriod',
    'period_status',
    'periodStatus',
    'מחזור',
  ]);

  if (periodValue !== null) {
    // Convert various formats to boolean
    if (typeof periodValue === 'boolean') {
      extracted.period = periodValue;
    } else if (typeof periodValue === 'string') {
      const lowerValue = periodValue.toLowerCase().trim();
      if (lowerValue === 'כן' || lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1') {
        extracted.period = true;
      } else if (lowerValue === 'לא' || lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0') {
        extracted.period = false;
      }
    } else if (typeof periodValue === 'number') {
      extracted.period = periodValue === 1;
    }
  }

  // Extract age - integer field
  const ageValue = findFieldValue([
    'age',
    'גיל',
    'age_years',
    'ageYears',
    'years_old',
    'yearsOld',
  ]);

  if (ageValue !== null) {
    const ageNum = typeof ageValue === 'number' ? ageValue : parseInt(String(ageValue), 10);
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
      extracted.age = ageNum;
    }
  }

  // Extract height - decimal field (in cm)
  const heightValue = findFieldValue([
    'height',
    'גובה',
    'height_cm',
    'heightCm',
    'heightInCm',
  ]);

  if (heightValue !== null) {
    const heightNum = typeof heightValue === 'number' ? heightValue : parseFloat(String(heightValue));
    if (!isNaN(heightNum) && heightNum > 0 && heightNum < 300) {
      extracted.height = heightNum;
    }
  }

  // Extract weight - decimal field (in kg)
  const weightValue = findFieldValue([
    'weight',
    'משקל',
    'weight_kg',
    'weightKg',
    'weightInKg',
  ]);

  if (weightValue !== null) {
    const weightNum = typeof weightValue === 'number' ? weightValue : parseFloat(String(weightValue));
    if (!isNaN(weightNum) && weightNum > 0 && weightNum < 500) {
      extracted.weight = weightNum;
    }
  }

  // Extract email - string field
  const emailValue = findFieldValue([
    'email',
    'אימייל',
    'e_mail',
    'eMail',
    'email_address',
    'emailAddress',
  ]);

  if (emailValue !== null && typeof emailValue === 'string' && emailValue.includes('@')) {
    const emailStr = emailValue.trim().toLowerCase();
    if (emailStr.length > 0 && emailStr.length < 255) {
      extracted.email = emailStr;
    }
  }

  return extracted;
}
