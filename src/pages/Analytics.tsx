/**
 * Analytics UI Component
 * 
 * Beautiful analytics dashboard with Highcharts visualizations.
 * Displays statistics for leads, customers, payments, and meetings.
 */

import { useState, useMemo, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAnalytics } from './Analytics';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Users, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Analytics = () => {
  const sidebarWidth = useSidebarWidth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = useCallback(() => {
    dispatch(logoutUser());
    navigate('/login');
  }, [dispatch, navigate]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | null>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });
  const [showAllData, setShowAllData] = useState(false);

  const { analyticsData, isLoading, error } = useAnalytics(showAllData ? null : dateRange || undefined);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Leads Over Time Chart
  const leadsOverTimeOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'line', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'line',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      xAxis: {
        categories: analyticsData.leadsOverTime.map(item => 
          format(parseISO(item.date), 'dd/MM', { locale: he })
        ),
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: { text: 'מספר לידים' },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
        style: {
          fontFamily: 'Heebo, system-ui, sans-serif',
        },
      },
      plotOptions: {
        line: {
          color: '#5B6FB9',
          lineWidth: 3,
          marker: {
            radius: 4,
            fillColor: '#5B6FB9',
          },
        },
      },
      series: [{
        type: 'line',
        name: 'לידים',
        data: analyticsData.leadsOverTime.map(item => item.count),
        color: '#5B6FB9',
      }],
    };
  }, [analyticsData]);

  // Leads By Status Pie Chart
  const leadsByStatusOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'pie', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'pie',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
        formatter: function() {
          return `<b>${this.point.name}</b><br/>${this.y} לידים (${this.percentage.toFixed(1)}%)`;
        },
      },
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b><br/>{point.percentage:.1f}%',
            style: {
              fontFamily: 'Heebo, system-ui, sans-serif',
              fontSize: '11px',
            },
          },
          showInLegend: true,
        },
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemStyle: {
          fontFamily: 'Heebo, system-ui, sans-serif',
          fontSize: '11px',
        },
      },
      series: [{
        type: 'pie',
        name: 'לידים',
        data: analyticsData.leadsByStatus.map(item => ({
          name: item.status,
          y: item.count,
        })),
        colors: ['#5B6FB9', '#7B8FC8', '#9BAFD8', '#BBCFE8', '#DBEFF8'],
      }],
    };
  }, [analyticsData]);

  // Leads By Source Chart
  const leadsBySourceOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'column', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'column',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      xAxis: {
        categories: analyticsData.leadsBySource.map(item => item.source),
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: { text: 'מספר לידים' },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
      },
      plotOptions: {
        column: {
          color: '#5B6FB9',
          borderRadius: 4,
        },
      },
      series: [{
        type: 'column',
        name: 'לידים',
        data: analyticsData.leadsBySource.map(item => item.count),
      }],
    };
  }, [analyticsData]);

  // Revenue Over Time Chart
  const revenueOverTimeOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'area', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'area',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      xAxis: {
        categories: analyticsData.paymentsOverTime.map(item => 
          format(parseISO(item.date), 'dd/MM', { locale: he })
        ),
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: { text: 'סכום (₪)' },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
        formatter: function() {
          return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}`;
        },
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(91, 111, 185, 0.3)'],
              [1, 'rgba(91, 111, 185, 0.05)'],
            ],
          },
          color: '#5B6FB9',
          lineWidth: 3,
          marker: {
            radius: 4,
            fillColor: '#5B6FB9',
          },
        },
      },
      series: [{
        type: 'area',
        name: 'הכנסות',
        data: analyticsData.paymentsOverTime.map(item => item.amount),
      }],
    };
  }, [analyticsData]);

  // Payments By Status Chart
  const paymentsByStatusOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'pie', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'pie',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
        formatter: function() {
          return `<b>${this.point.name}</b><br/>${formatCurrency((this.point as any).amount || 0)}<br/>${this.y} תשלומים (${this.percentage.toFixed(1)}%)`;
        },
      },
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b><br/>{point.percentage:.1f}%',
            style: {
              fontFamily: 'Heebo, system-ui, sans-serif',
              fontSize: '11px',
            },
          },
          showInLegend: true,
        },
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemStyle: {
          fontFamily: 'Heebo, system-ui, sans-serif',
          fontSize: '11px',
        },
      },
      series: [{
        type: 'pie',
        name: 'תשלומים',
        data: analyticsData.paymentsByStatus.map(item => ({
          name: item.status,
          y: item.count,
          amount: item.amount,
        })),
        colors: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
      }],
    };
  }, [analyticsData]);

  // Customers Over Time Chart
  const customersOverTimeOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'line', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'line',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      xAxis: {
        categories: analyticsData.customersOverTime.map(item => 
          format(parseISO(item.date), 'dd/MM', { locale: he })
        ),
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: { text: 'מספר לקוחות' },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
      },
      plotOptions: {
        line: {
          color: '#10b981',
          lineWidth: 3,
          marker: {
            radius: 4,
            fillColor: '#10b981',
          },
        },
      },
      series: [{
        type: 'line',
        name: 'לקוחות',
        data: analyticsData.customersOverTime.map(item => item.count),
        color: '#10b981',
      }],
    };
  }, [analyticsData]);

  // Meetings Over Time Chart
  const meetingsOverTimeOptions = useMemo((): Highcharts.Options => {
    if (!analyticsData) {
      return {
        chart: { type: 'column', height: 350, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'column',
        height: 350,
        backgroundColor: 'transparent',
      },
      title: {
        text: '',
      },
      credits: { enabled: false },
      xAxis: {
        categories: analyticsData.meetingsOverTime.map(item => 
          format(parseISO(item.date), 'dd/MM', { locale: he })
        ),
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: { text: 'מספר פגישות' },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
      },
      plotOptions: {
        column: {
          color: '#8b5cf6',
          borderRadius: 4,
        },
      },
      series: [{
        type: 'column',
        name: 'פגישות',
        data: analyticsData.meetingsOverTime.map(item => item.count),
      }],
    };
  }, [analyticsData]);

  return (
    <>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar />}
      />
      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
        <main
          className="bg-gray-50 overflow-y-auto transition-all duration-300"
          style={{
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <div className="p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">אנליטיקה ודוחות</h1>
                <p className="text-gray-600 text-sm md:text-base">סקירה מקיפה של כל הנתונים והסטטיסטיקות</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showAllData"
                    checked={showAllData}
                    onChange={(e) => {
                      setShowAllData(e.target.checked);
                      if (e.target.checked) {
                        setDateRange(null);
                      } else {
                        // Reset to default 30 days
                        const to = new Date();
                        const from = new Date();
                        from.setDate(from.getDate() - 30);
                        setDateRange({ from, to });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showAllData" className="text-sm font-medium text-gray-700 cursor-pointer">
                    הצג את כל הנתונים
                  </label>
                </div>
                {!showAllData && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">טווח תאריכים</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[280px] justify-start text-right font-normal",
                              !dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "dd/MM/yyyy", { locale: he })} -{" "}
                                  {format(dateRange.to, "dd/MM/yyyy", { locale: he })}
                                </>
                              ) : (
                                format(dateRange.from, "dd/MM/yyyy", { locale: he })
                              )
                            ) : (
                              <span>בחר טווח תאריכים</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end" dir="rtl">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                              if (range?.from && range?.to) {
                                setDateRange(range);
                              } else if (range?.from) {
                                setDateRange({ from: range.from, to: undefined });
                              }
                            }}
                            numberOfMonths={2}
                            locale={he}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(from.getDate() - 7);
                          setDateRange({ from, to });
                        }}
                      >
                        7 ימים
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(from.getDate() - 30);
                          setDateRange({ from, to });
                        }}
                      >
                        30 ימים
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(from.getDate() - 90);
                          setDateRange({ from, to });
                        }}
                      >
                        90 ימים
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setFullYear(from.getFullYear() - 1);
                          setDateRange({ from, to });
                        }}
                      >
                        שנה אחרונה
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-2"></div>
                  <p className="text-sm text-gray-600">טוען נתונים...</p>
                </div>
              </div>
            ) : analyticsData ? (
              <>
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-blue-100 text-sm font-medium">סה"כ לידים</CardDescription>
                        <div className="bg-white/20 rounded-lg p-2">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-4xl font-bold text-white mt-2">
                        {analyticsData.totalLeads.toLocaleString('he-IL')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-blue-100 text-sm">
                        <span>בתקופה הנבחרת</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-emerald-100 text-sm font-medium">סה"כ לקוחות</CardDescription>
                        <div className="bg-white/20 rounded-lg p-2">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-4xl font-bold text-white mt-2">
                        {analyticsData.totalCustomers.toLocaleString('he-IL')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-emerald-100 text-sm">
                        <span>לקוחות חדשים</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-purple-100 text-sm font-medium">סה"כ הכנסות</CardDescription>
                        <div className="bg-white/20 rounded-lg p-2">
                          <DollarSign className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-4xl font-bold text-white mt-2">
                        {formatCurrency(analyticsData.totalRevenue)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-purple-100 text-sm">
                        <span>תשלומים מאושרים</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-amber-100 text-sm font-medium">סה"כ פגישות</CardDescription>
                        <div className="bg-white/20 rounded-lg p-2">
                          <Calendar className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-4xl font-bold text-white mt-2">
                        {analyticsData.totalMeetings.toLocaleString('he-IL')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-amber-100 text-sm">
                        <span>
                          {analyticsData.completedMeetings} הושלמו, {analyticsData.scheduledMeetings} מתוכננות
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Leads Over Time */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">לידים לאורך זמן</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={leadsOverTimeOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Leads By Status */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">לידים לפי סטטוס</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={leadsByStatusOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Leads By Source */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">לידים לפי מקור</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={leadsBySourceOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Revenue Over Time */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">הכנסות לאורך זמן</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={revenueOverTimeOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Payments By Status */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">תשלומים לפי סטטוס</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={paymentsByStatusOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Customers Over Time */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">לקוחות לאורך זמן</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={customersOverTimeOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Meetings Over Time */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">פגישות לאורך זמן</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={meetingsOverTimeOptions}
                      />
                    </CardContent>
                  </Card>

                  {/* Additional Stats Card */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">סיכום נוסף</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">סה"כ תשלומים</span>
                        <span className="font-bold text-gray-900 text-xl">{analyticsData.totalPayments.toLocaleString('he-IL')}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">סה"כ גבייה</span>
                        <span className="font-bold text-gray-900 text-xl">{formatCurrency(analyticsData.totalCollectionsAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">מספר גבייה</span>
                        <span className="font-bold text-gray-900 text-xl">{analyticsData.totalCollections.toLocaleString('he-IL')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
};

export default Analytics;
