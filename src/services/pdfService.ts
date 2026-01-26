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
    pdfContainer.style.top = '0';
    pdfContainer.style.width = '210mm'; // A4 width (794px at 96 DPI)
    pdfContainer.style.maxWidth = '794px';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.direction = 'rtl';
    pdfContainer.style.fontFamily = "'Heebo', 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
    pdfContainer.style.padding = '0';
    pdfContainer.style.margin = '0';
    pdfContainer.style.overflow = 'hidden';
    document.body.appendChild(pdfContainer);

    // Build HTML content
    const htmlContent = buildBudgetHTML(budget);
    pdfContainer.innerHTML = htmlContent;

    // Wait for fonts and images to load
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Ensure images are loaded
    const images = pdfContainer.querySelectorAll('img');
    if (images.length > 0) {
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(resolve, 2000); // Timeout after 2s
          });
        })
      );
    }

    // Convert HTML to canvas with optimized settings for single page
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pdfContainer.offsetWidth,
      height: pdfContainer.scrollHeight,
      windowWidth: 794, // A4 width in pixels at 96 DPI
      windowHeight: pdfContainer.scrollHeight,
    });

    // Create PDF - Single page A4 with smart scaling
    const imgData = canvas.toDataURL('image/png', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    
    // Calculate dimensions
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    
    // Always scale to fit on one page perfectly
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    
    if (imgHeight > pageHeight) {
      // Scale down proportionally to fit height
      const scale = pageHeight / imgHeight;
      finalWidth = imgWidth * scale;
      finalHeight = pageHeight;
    }
    
    // Center the content if it's smaller than page
    const xOffset = imgHeight > pageHeight ? 0 : (pageWidth - finalWidth) / 2;
    const yOffset = 0;
    
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

    // Save PDF
    const fileName = `תכנית_פעולה_${budget.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // Clean up
    document.body.removeChild(pdfContainer);
  } catch (error) {
    throw new Error('שגיאה ביצירת קובץ PDF. אנא נסה שוב.');
  }
};

/**
 * Build HTML content for the budget PDF
 * Premium Luxury Design with Modern Feminine palette and Bento Grid layout
 */
const buildBudgetHTML = (budget: Budget): string => {
  const nutrition = budget.nutrition_targets;
  const supplements = budget.supplements || [];
  
  // Logo URL
  const logoUrl = 'https://dietneta.com/wp-content/uploads/2025/08/logo.svg';
  
  // Unicode/Emoji icons for better PDF compatibility
  const flameIcon = '🔥';
  const dropIcon = '💧';
  const leafIcon = '🍃';
  const footstepIcon = '👣';
  const checkIcon = '✓';

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Heebo', 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: #ffffff;
          color: #333333;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 210mm; max-height: 1123px; margin: 0 auto; background: #ffffff; padding: 0; overflow: hidden;">
        
        <!-- Compact Premium Header with Logo -->
        <div style="background: linear-gradient(135deg, #F4C2C2 0%, #f8d4d4 100%); padding: 20px 35px; text-align: center;">
          <div style="margin-bottom: 10px;">
            <img src="${logoUrl}" alt="DietNeta Logo" style="height: 45px; width: auto; max-width: 220px; filter: brightness(0) invert(1); opacity: 0.95;" />
          </div>
          <div style="font-size: 14px; font-weight: 400; color: #333333; letter-spacing: 0.5px;">
            תכנית פעולה אימון ותזונה מקצועית
          </div>
        </div>

        <!-- Compact Client Profile Header -->
        <div style="padding: 20px 35px; background: #ffffff; border-bottom: 1px solid #f0f0f0;">
          <div style="font-size: 10px; font-weight: 500; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            תוכנית אישית
          </div>
          <h1 style="font-size: 26px; font-weight: 700; color: #333333; margin: 0; letter-spacing: -0.3px; line-height: 1.2;">
            ${budget.name}
          </h1>
          ${budget.description ? `
            <p style="font-size: 13px; font-weight: 300; color: #666; margin-top: 8px; line-height: 1.5;">
              ${budget.description}
            </p>
          ` : ''}
        </div>

        <!-- Compact Bento Grid Nutrition Section -->
        <div style="padding: 25px 35px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
            <div style="font-size: 24px; line-height: 1;">${flameIcon}</div>
            <h2 style="font-size: 20px; font-weight: 700; color: #333333; margin: 0; letter-spacing: -0.3px;">
              תזונה יומית
            </h2>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
            <!-- Calories Card -->
            <div style="background: linear-gradient(135deg, #fef8f8 0%, #fdf5f5 100%); padding: 18px 16px; border-radius: 16px; box-shadow: 0 3px 15px rgba(244, 194, 194, 0.12); border: 1px solid rgba(244, 194, 194, 0.2);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="font-size: 18px; line-height: 1;">${flameIcon}</div>
                <div style="font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
                  קלוריות
                </div>
              </div>
              <div style="font-size: 32px; font-weight: 800; color: #333333; line-height: 1; margin-bottom: 2px;">
                ${nutrition.calories.toLocaleString()}
              </div>
              <div style="font-size: 11px; font-weight: 300; color: #999;">
                קק״ל
              </div>
            </div>

            <!-- Protein Card -->
            <div style="background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); padding: 18px 16px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); border: 1px solid #f0f0f0;">
              <div style="font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                חלבון
              </div>
              <div style="font-size: 32px; font-weight: 800; color: #333333; line-height: 1; margin-bottom: 2px;">
                ${nutrition.protein}
              </div>
              <div style="font-size: 11px; font-weight: 300; color: #999;">
                גרם
              </div>
            </div>

            <!-- Carbs Card -->
            <div style="background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); padding: 18px 16px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); border: 1px solid #f0f0f0;">
              <div style="font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                פחמימות
              </div>
              <div style="font-size: 32px; font-weight: 800; color: #333333; line-height: 1; margin-bottom: 2px;">
                ${nutrition.carbs}
              </div>
              <div style="font-size: 11px; font-weight: 300; color: #999;">
                גרם
              </div>
            </div>

            <!-- Fat Card -->
            <div style="background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); padding: 18px 16px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); border: 1px solid #f0f0f0;">
              <div style="font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                שומן
              </div>
              <div style="font-size: 32px; font-weight: 800; color: #333333; line-height: 1; margin-bottom: 2px;">
                ${nutrition.fat}
              </div>
              <div style="font-size: 11px; font-weight: 300; color: #999;">
                גרם
              </div>
            </div>

            <!-- Fiber Card -->
            <div style="background: linear-gradient(135deg, #f8fdf8 0%, #f5fbf5 100%); padding: 18px 16px; border-radius: 16px; box-shadow: 0 2px 10px rgba(244, 194, 194, 0.1); border: 1px solid rgba(244, 194, 194, 0.2);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="font-size: 18px; line-height: 1;">${leafIcon}</div>
                <div style="font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
                  סיבים
                </div>
              </div>
              <div style="font-size: 32px; font-weight: 800; color: #333333; line-height: 1; margin-bottom: 2px;">
                ${nutrition.fiber_min}
              </div>
              <div style="font-size: 11px; font-weight: 300; color: #999;">
                גרם (מינ')
              </div>
            </div>

          </div>
        </div>

        <!-- Compact Hero Steps Section -->
        ${budget.steps_goal ? `
          <div style="padding: 20px 35px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
              <div style="font-size: 28px; line-height: 1;">${footstepIcon}</div>
              <h2 style="font-size: 20px; font-weight: 700; color: #333333; margin: 0; letter-spacing: -0.3px;">
                יעד צעדים יומי
              </h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef8f8 0%, #ffffff 100%); padding: 25px 28px; border-radius: 18px; box-shadow: 0 4px 20px rgba(244, 194, 194, 0.15); border: 2px solid rgba(244, 194, 194, 0.25); text-align: center;">
              <div style="font-size: 48px; font-weight: 900; color: #333333; line-height: 1; margin-bottom: 6px; letter-spacing: -1px;">
                ${budget.steps_goal.toLocaleString()}
              </div>
              <div style="font-size: 13px; font-weight: 500; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
                צעדים
              </div>
              ${budget.steps_instructions ? `
                <div style="margin-top: 15px; padding: 16px; background: rgba(244, 194, 194, 0.08); border-radius: 12px; border-right: 3px solid #F4C2C2; text-align: right;">
                  <div style="font-size: 12px; font-weight: 400; color: #333333; line-height: 1.6; white-space: pre-wrap;">
                    ${budget.steps_instructions}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Compact Supplements Section -->
        ${supplements.length > 0 ? `
          <div style="padding: 20px 35px; background: #fafafa;">
            <h2 style="font-size: 20px; font-weight: 700; color: #333333; margin: 0 0 16px 0; letter-spacing: -0.3px;">
              תוספי תזונה
            </h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              ${supplements.map((supplement: Supplement) => `
                <div style="background: #ffffff; padding: 16px 18px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border-right: 3px solid #F4C2C2; display: flex; align-items: flex-start; gap: 12px;">
                  <div style="margin-top: 2px; flex-shrink: 0; width: 22px; height: 22px; background: linear-gradient(135deg, #F4C2C2 0%, #f8d4d4 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 900; line-height: 1; box-shadow: 0 2px 6px rgba(244, 194, 194, 0.3);">
                    <span style="font-family: Arial, sans-serif;">✓</span>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 15px; font-weight: 700; color: #333333; margin-bottom: 6px; line-height: 1.3;">
                      ${supplement.name}
                    </div>
                    <div style="font-size: 11px; font-weight: 400; color: #666; line-height: 1.5;">
                      <div><strong>מינון:</strong> ${supplement.dosage}</div>
                      <div><strong>זמן:</strong> ${supplement.timing}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Compact Eating Rules & Order Section -->
        ${(budget.eating_rules || budget.eating_order) ? `
          <div style="padding: 20px 35px; background: #ffffff; display: grid; grid-template-columns: ${budget.eating_rules && budget.eating_order ? '1fr 1fr' : '1fr'}; gap: 16px;">
            ${budget.eating_rules ? `
              <div>
                <h2 style="font-size: 18px; font-weight: 700; color: #333333; margin: 0 0 12px 0; letter-spacing: -0.3px;">
                  כללי אכילה
                </h2>
                <div style="background: #fafafa; padding: 16px 18px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border-right: 3px solid #F4C2C2; min-height: 100px;">
                  <div style="font-size: 12px; font-weight: 400; color: #333333; line-height: 1.6; white-space: pre-wrap;">
                    ${budget.eating_rules}
                  </div>
                </div>
              </div>
            ` : ''}
            ${budget.eating_order ? `
              <div>
                <h2 style="font-size: 18px; font-weight: 700; color: #333333; margin: 0 0 12px 0; letter-spacing: -0.3px;">
                  סדר אכילה
                </h2>
                <div style="background: linear-gradient(135deg, #fef8f8 0%, #fafafa 100%); padding: 16px 18px; border-radius: 14px; box-shadow: 0 2px 8px rgba(244, 194, 194, 0.1); border-right: 3px solid #F4C2C2; min-height: 100px;">
                  <div style="font-size: 12px; font-weight: 400; color: #333333; line-height: 1.6; white-space: pre-wrap;">
                    ${budget.eating_order}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Compact Premium Footer -->
        <div style="padding: 20px 35px; background: linear-gradient(135deg, #333333 0%, #444444 100%); color: #ffffff; margin-top: 15px;">
          <div style="text-align: center; margin-bottom: 12px;">
            <img src="${logoUrl}" alt="DietNeta Logo" style="height: 32px; width: auto; max-width: 180px; filter: brightness(0) invert(1); opacity: 0.95;" />
          </div>
          <div style="text-align: center; font-size: 11px; font-weight: 300; color: rgba(255, 255, 255, 0.8); line-height: 1.6;">
            <div style="margin-bottom: 4px;">נוצר בתאריך: ${new Date(budget.created_at).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style="font-weight: 400; color: rgba(255, 255, 255, 0.95); font-size: 12px;">
              DietNeta - תכנית פעולה מקצועית לאימון ותזונה
            </div>
          </div>
        </div>

      </div>
    </body>
    </html>
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

