import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useLeadDetailsPage } from './LeadDetails';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Edit,
  Dumbbell,
  Footprints,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { useAppSelector } from '@/store/hooks';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';

const LeadDetails = () => {
  const {
    lead,
    bmi,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
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
  } = useLeadDetailsPage();
  
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
    // Check if status matches any category or sub-status
    if (status === 'מתקדמת לתהליך') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
        status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    // Legacy statuses
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
                          <Popover open={isOpen} onOpenChange={(open) => open ? handleOpen() : handleClose()}>
                            <PopoverTrigger asChild>
                              <button
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(lead.status)} hover:opacity-80 transition-opacity cursor-pointer`}
                              >
                                {lead.status}
                                <Edit className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start" dir="rtl">
                              <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 mb-3">עדכן סטטוס</h3>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    סטטוס ראשי
                                  </label>
                                  <Select
                                    value={selectedCategory}
                                    onValueChange={handleCategoryChange}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר סטטוס ראשי" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {STATUS_CATEGORIES.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {hasSubStatuses && selectedCategoryData?.subStatuses && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      סטטוס משני
                                    </label>
                                    <Select
                                      value={selectedSubStatus}
                                      onValueChange={handleSubStatusChange}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="בחר סטטוס משני" />
                                      </SelectTrigger>
                                      <SelectContent dir="rtl">
                                        {selectedCategoryData.subStatuses.map((subStatus) => (
                                          <SelectItem key={subStatus.id} value={subStatus.id}>
                                            {subStatus.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    שמור
                                  </Button>
                                  <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    ביטול
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
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

        {/* Fitness & Wellness Protocol */}
        <Card className="p-6 bg-white border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            פרוטוקול יומי
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Part A: Activity Targets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">יעדי פעילות</h3>
              
              {/* Weekly Workouts */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 mb-2">כמות אימונים שבועית</p>
                    <p className="text-4xl font-bold text-orange-900">{lead.weeklyWorkouts}</p>
                    <p className="text-xs text-orange-700 mt-1">אימונים בשבוע</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-orange-200 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-orange-700" />
                  </div>
                </div>
              </div>

              {/* Daily Steps */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-5 border border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-600 mb-2">יעד צעדים יומי</p>
                    <p className="text-4xl font-bold text-cyan-900">
                      {lead.dailyStepsGoal.toLocaleString('he-IL')}
                    </p>
                    <p className="text-xs text-cyan-700 mt-1">צעדים</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-cyan-200 flex items-center justify-center">
                    <Footprints className="h-8 w-8 text-cyan-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Part B: Supplements Stack */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">תוספים יומיים</h3>
              <div className="space-y-3">
                {lead.dailySupplements.map((supplement, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 hover:shadow-md transition-shadow"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-800">{supplement}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Journey & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Column 1: Workout Plans History (Larger - 2 columns) */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-blue-600" />
                היסטוריית תוכניות אימון
              </h2>
              <div className="space-y-4">
                {lead.workoutProgramsHistory.map((program, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {program.programName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(program.startDate)} - {formatDate(program.validUntil)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {program.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      {program.description}
                    </p>

                    {/* Footer - Training Breakdown */}
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                        כוח: {program.strengthCount}
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                        קרדיו: {program.cardioCount}
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                        אינטרוולים: {program.intervalsCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Column 2: Subscription & Steps (Smaller - 1 column) */}
          <div className="space-y-6">
            {/* Subscription Details Card */}
            <Card className="p-6 bg-white border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                פרטי מנוי
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    תאריך הצטרפות
                  </span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatDate(lead.subscription.joinDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 bg-blue-50 rounded-lg px-3">
                  <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    שבוע נוכחי
                  </span>
                  <span className="text-base font-bold text-blue-900">
                    {lead.subscription.currentWeekInProgram}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">חבילה ראשונית</span>
                  <span className="text-base font-semibold text-gray-900">
                    {lead.subscription.initialPackageMonths} חודשים
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">מחיר ראשוני</span>
                  <span className="text-base font-semibold text-gray-900">
                    ₪{lead.subscription.initialPrice.toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">מחיר חידוש חודשי</span>
                  <span className="text-base font-semibold text-gray-900">
                    ₪{lead.subscription.monthlyRenewalPrice.toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">זמן בתקציב נוכחי</span>
                  <span className="text-base font-semibold text-gray-900">
                    {lead.subscription.timeInCurrentBudget}
                  </span>
                </div>
              </div>
            </Card>

            {/* Steps Progression Card */}
            <Card className="p-6 bg-white border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Footprints className="h-5 w-5 text-cyan-600" />
                היסטוריית צעדים
              </h2>
              <div className="space-y-4">
                {lead.stepsHistory.map((step, index) => {
                  const isCurrent = index === lead.stepsHistory.length - 1;
                  return (
                    <div
                      key={index}
                      className={`relative pr-4 ${
                        index < lead.stepsHistory.length - 1 ? 'pb-6' : ''
                      }`}
                    >
                      {/* Timeline line */}
                      {index < lead.stepsHistory.length - 1 && (
                        <div className="absolute right-2 top-8 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      
                      {/* Timeline dot */}
                      <div
                        className={`absolute right-0 top-1 w-4 h-4 rounded-full border-2 ${
                          isCurrent
                            ? 'bg-cyan-500 border-cyan-600'
                            : 'bg-white border-gray-300'
                        }`}
                      />

                      {/* Content */}
                      <div
                        className={`rounded-lg p-4 ${
                          isCurrent
                            ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent ? 'text-cyan-900' : 'text-gray-700'
                            }`}
                          >
                            {step.weekNumber}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-cyan-700 bg-cyan-200 px-2 py-1 rounded-full">
                              פעיל
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {formatDate(step.startDate)} - {formatDate(step.endDate)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Footprints className="h-4 w-4 text-gray-500" />
                          <span className="text-base font-bold text-gray-900">
                            {step.target.toLocaleString('he-IL')} צעדים
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
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

