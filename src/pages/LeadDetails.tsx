import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useLeadDetailsPage } from './LeadDetails';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Mail,
  Ruler,
  Weight,
  Activity,
  Target,
  User,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { useAppSelector } from '@/store/hooks';

const LeadDetails = () => {
  const { lead, bmi, handleBack, handleCall, handleWhatsApp, handleEmail } =
    useLeadDetailsPage();
  
  const { columnVisibility } = useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.auth);

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ליד לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'חדש':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'בטיפול':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הושלם':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'תת משקל';
    if (bmi < 25) return 'נורמלי';
    if (bmi < 30) return 'עודף משקל';
    return 'השמנה';
  };

  const getBMIColor = (bmi: number): string => {
    if (bmi < 18.5) return 'text-blue-600';
    if (bmi < 25) return 'text-green-600';
    if (bmi < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          searchQuery=""
          columnVisibility={columnVisibility}
          userEmail={user?.email}
          isSettingsOpen={false}
          onSearchChange={() => {}}
          onToggleColumn={() => {}}
          onLogout={() => {}}
          onSettingsOpenChange={() => {}}
        />

        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
            <div className="p-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
                {/* Header */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleBack}
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <ArrowRight className="ml-2 h-5 w-5" />
                        חזור לדשבורד
                      </Button>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{lead.name}</h1>
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(lead.status)}`}
                          >
                            {lead.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            ID: <span className="font-mono">{lead.id}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleCall}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <Phone className="ml-2 h-5 w-5" />
                        התקשר
                      </Button>
                      <Button
                        onClick={handleWhatsApp}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <MessageCircle className="ml-2 h-5 w-5" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={handleEmail}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                        size="lg"
                      >
                        <Mail className="ml-2 h-5 w-5" />
                        אימייל
                      </Button>
                    </div>
                  </div>
                </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">גובה</p>
                <p className="text-3xl font-bold text-blue-900">{lead.height} ס"מ</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                <Ruler className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">משקל</p>
                <p className="text-3xl font-bold text-purple-900">{lead.weight} ק"ג</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                <Weight className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 mb-1">BMI</p>
                <p className={`text-3xl font-bold ${getBMIColor(bmi)}`}>{bmi}</p>
                <p className="text-xs text-gray-600 mt-1">{getBMICategory(bmi)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center">
                <Activity className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <Card className="p-6 bg-white border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              מידע אישי
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">גיל</span>
                <span className="text-base font-semibold text-gray-900">{lead.age} שנים</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">תאריך לידה</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatDate(lead.birthDate)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">טלפון</span>
                <span className="text-base font-semibold text-gray-900 font-mono">
                  {lead.phone}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">אימייל</span>
                <span className="text-base font-semibold text-gray-900">{lead.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-500">תאריך יצירה</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatDate(lead.createdDate)}
                </span>
              </div>
            </div>
          </Card>

          {/* Fitness Info */}
          <Card className="p-6 bg-white border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              מידע כושר
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">מטרת כושר</span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                  {lead.fitnessGoal}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">רמת פעילות</span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-100">
                  {lead.activityLevel}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">זמן מועדף</span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                  {lead.preferredTime}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-500">מקור</span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                  {lead.source}
                </span>
              </div>
            </div>
          </Card>
        </div>

                {/* Notes Section */}
                {lead.notes && (
                  <Card className="p-6 bg-white border-gray-200 mt-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      הערות
                    </h2>
                    <p className="text-gray-700 leading-relaxed">{lead.notes}</p>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;

