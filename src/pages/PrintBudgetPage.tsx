/**
 * PrintBudgetPage Component
 * 
 * Print-optimized page for displaying budget details
 */

import { usePrintBudgetPage } from './PrintBudgetPage';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { 
  FileText, 
  Printer,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BudgetPrintContent } from '@/components/dashboard/BudgetPrintContent';

const PrintBudgetPage = () => {
  const navigate = useNavigate();
  const { budget, nutritionTemplate, workoutTemplate, workoutPlan, workoutData, clientName, assignedDate, isLoading } = usePrintBudgetPage();

  // Debug logs for workout template
  useEffect(() => {
    console.log('=== PrintBudgetPage Debug ===');
    console.log('Budget:', budget);
    console.log('Budget workout_template_id:', budget?.workout_template_id);
    console.log('WorkoutTemplate:', workoutTemplate);
    console.log('WorkoutPlan:', workoutPlan);
    console.log('WorkoutData:', workoutData);
    console.log('WorkoutData weeklyWorkout:', workoutData?.weeklyWorkout);
    if (workoutData?.weeklyWorkout) {
      console.log('WeeklyWorkout days:', workoutData.weeklyWorkout.days);
      console.log('Days entries:', Object.entries(workoutData.weeklyWorkout.days || {}));
      Object.entries(workoutData.weeklyWorkout.days || {}).forEach(([dayKey, dayData]: [string, any]) => {
        console.log(`Day ${dayKey}:`, dayData);
        console.log(`Day ${dayKey} exercises:`, dayData?.exercises);
        console.log(`Day ${dayKey} exercises length:`, dayData?.exercises?.length);
      });
    }
    console.log('===========================');
  }, [budget, workoutTemplate, workoutPlan, workoutData]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">תכנית פעולה לא נמצאה</p>
          <p className="text-gray-600">תכנית הפעולה המבוקשת לא קיימת או שאין לך הרשאה לצפות בה</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Back Button - Only visible on screen */}
      <div className="print:hidden fixed top-6 right-6 z-50">
        <Button
          onClick={handleBack}
          size="lg"
          variant="outline"
          className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-lg"
        >
          <ArrowLeft className="h-5 w-5 ml-2" />
          חזור
        </Button>
      </div>

      {/* Print Now Button - Only visible on screen */}
      <div className="print:hidden fixed bottom-6 left-6 z-50">
        <Button
          onClick={handlePrint}
          size="lg"
          className="text-white shadow-lg hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: "#5B6FB9",
          }}
        >
          <Printer className="h-5 w-5 mr-2" />
          הדפס עכשיו
        </Button>
      </div>

      {/* Main Content */}
      <BudgetPrintContent
        budget={budget}
        nutritionTemplate={nutritionTemplate}
        workoutTemplate={workoutTemplate}
        workoutPlan={workoutPlan}
        workoutData={workoutData}
        clientName={clientName}
        assignedDate={assignedDate}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:bg-gray-50 {
            background: #f9fafb !important;
          }
          
          .print\\:shadow-xl {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          }
          
          .print\\:rounded-xl {
            border-radius: 0.75rem !important;
          }
          
          .print\\:p-4 {
            padding: 1rem !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print-header-bg {
            background: #E96A8F !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve all colors and backgrounds */
          [class*="bg-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve borders */
          [class*="border"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve text colors */
          [class*="text-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .print\\:break-inside-auto {
            break-inside: auto;
            page-break-inside: auto;
          }
          
          .print\\:break-after-avoid {
            break-after: avoid;
            page-break-after: avoid;
          }
          
          .print\\:break-after-auto {
            break-after: auto;
            page-break-after: auto;
          }
          
          .print\\:w-24 {
            width: 6rem !important;
          }
          
          .print\\:h-24 {
            height: 6rem !important;
          }
          
          /* Allow tables to break across pages but keep rows together */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          .page-number::after {
            content: counter(page);
          }
          
          /* Page counter setup */
          body {
            counter-reset: page;
          }
          
          @page {
            counter-increment: page;
          }
          
          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
};

export default PrintBudgetPage;

