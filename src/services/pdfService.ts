/**
 * PDF Service
 * 
 * Service for generating high-quality PDF documents from budget data
 * Uses jsPDF and html2canvas for client-side PDF generation
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';

/**
 * Generate a luxury-style PDF for a budget (Taktziv)
 * Based on the "Luxury Taktziv" design with pink header and DietNeta branding
 */
export const generateBudgetPDF = async (budget: Budget): Promise<void> => {
  try {
    // Create a temporary HTML element to render the PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.direction = 'rtl';
    pdfContainer.style.fontFamily = "'Heebo', 'Segoe UI', Arial, sans-serif";
    pdfContainer.style.padding = '0';
    pdfContainer.style.margin = '0';
    document.body.appendChild(pdfContainer);

    // Build HTML content
    const htmlContent = buildBudgetHTML(budget);
    pdfContainer.innerHTML = htmlContent;

    // Wait for fonts and images to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Convert HTML to canvas
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pdfContainer.offsetWidth,
      height: pdfContainer.scrollHeight,
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save PDF
    const fileName = `תקציב_${budget.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // Clean up
    document.body.removeChild(pdfContainer);
  } catch (error) {
    console.error('[pdfService] Error generating PDF:', error);
    throw new Error('שגיאה ביצירת קובץ PDF. אנא נסה שוב.');
  }
};

/**
 * Build HTML content for the budget PDF
 * Matches the luxury Taktziv design with pink header
 */
const buildBudgetHTML = (budget: Budget): string => {
  const nutrition = budget.nutrition_targets;
  const supplements = budget.supplements || [];

  return `
    <div style="width: 100%; background: #ffffff; color: #1a1a1a;">
      <!-- Header with pink background -->
      <div style="background: linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%); padding: 30px 40px; text-align: center; color: #ffffff;">
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 10px;">DietNeta</div>
        <div style="font-size: 20px; opacity: 0.95;">תקציב אימון ותזונה</div>
      </div>

      <!-- Budget Name Section -->
      <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
        <h1 style="font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 0 0 10px 0;">
          ${budget.name}
        </h1>
        ${budget.description ? `
          <p style="font-size: 16px; color: #666; margin: 0; line-height: 1.6;">
            ${budget.description}
          </p>
        ` : ''}
      </div>

      <!-- Nutrition Section -->
      <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
        <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b9d; padding-bottom: 10px;">
          תזונה
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">קלוריות יומיות</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.calories.toLocaleString()} קק״ל</div>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">חלבון</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.protein} ג׳</div>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">פחמימות</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.carbs} ג׳</div>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">שומן</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.fat} ג׳</div>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">סיבים (מינימום)</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.fiber_min} ג׳</div>
          </div>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">מים (מינימום)</div>
            <div style="font-size: 24px; font-weight: bold; color: #1a1a1a;">${nutrition.water_min} ליטר</div>
          </div>
        </div>
      </div>

      <!-- Steps Section -->
      ${budget.steps_goal ? `
        <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b9d; padding-bottom: 10px;">
            צעדים
          </h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <div style="font-size: 18px; color: #666; margin-bottom: 10px;">יעד צעדים יומי</div>
            <div style="font-size: 32px; font-weight: bold; color: #1a1a1a;">${budget.steps_goal.toLocaleString()}</div>
          </div>
          ${budget.steps_instructions ? `
            <div style="margin-top: 20px; padding: 15px; background: #fff9f5; border-right: 4px solid #ff6b9d; border-radius: 4px;">
              <div style="font-size: 16px; color: #1a1a1a; line-height: 1.8; white-space: pre-wrap;">
                ${budget.steps_instructions}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Supplements Section -->
      ${supplements.length > 0 ? `
        <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b9d; padding-bottom: 10px;">
            תוספי תזונה
          </h2>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${supplements.map((supplement: Supplement) => `
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-right: 4px solid #ff6b9d;">
                <div style="font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 10px;">
                  ${supplement.name}
                </div>
                <div style="font-size: 16px; color: #666; margin-bottom: 5px;">
                  <strong>מינון:</strong> ${supplement.dosage}
                </div>
                <div style="font-size: 16px; color: #666;">
                  <strong>זמן נטילה:</strong> ${supplement.timing}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Eating Rules Section -->
      ${budget.eating_rules ? `
        <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b9d; padding-bottom: 10px;">
            כללי אכילה
          </h2>
          <div style="background: #fff9f5; padding: 20px; border-radius: 8px; border-right: 4px solid #ff6b9d;">
            <div style="font-size: 16px; color: #1a1a1a; line-height: 1.8; white-space: pre-wrap;">
              ${budget.eating_rules}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Eating Order Section -->
      ${budget.eating_order ? `
        <div style="padding: 30px 40px; border-bottom: 2px solid #f0f0f0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0; border-bottom: 2px solid #ff6b9d; padding-bottom: 10px;">
            סדר אכילה
          </h2>
          <div style="background: #fff9f5; padding: 20px; border-radius: 8px; border-right: 4px solid #ff6b9d;">
            <div style="font-size: 16px; color: #1a1a1a; line-height: 1.8; white-space: pre-wrap;">
              ${budget.eating_order}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="padding: 20px 40px; background: #f9f9f9; text-align: center; color: #666; font-size: 14px;">
        <div>נוצר בתאריך: ${new Date(budget.created_at).toLocaleDateString('he-IL')}</div>
        <div style="margin-top: 10px; font-weight: bold; color: #ff6b9d;">DietNeta - תקציב מקצועי לאימון ותזונה</div>
      </div>
    </div>
  `;
};

/**
 * Generate a budget link for sharing
 * In a real implementation, this would create a shareable URL
 */
export const generateBudgetLink = (budgetId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/budget/${budgetId}`;
};

