/**
 * 
 */

import { useParams, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeeting } from '@/hooks/useMeetings';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { formatDate } from '@/utils/dashboard';

const MeetingDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const { data: meeting, isLoading } = useMeeting(id || null);

  const handleBack = () => {
    navigate('/dashboard/meetings');
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('[MeetingDetailView] Logout error:', error);
      navigate('/login');
    }
  };

  const handleSaveViewClick = () => {};
  const handleEditViewClick = () => {};

  if (isLoading) {
    return (
      <>
        <DashboardHeader 
          userEmail={user?.email} 
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
        />
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
          <main 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: 'calc(100vh - 88px)',
            }}
          >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-gray-600">טוען פרטי פגישה...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <DashboardHeader 
          userEmail={user?.email} 
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
        />
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
          <main 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: 'calc(100vh - 88px)',
            }}
          >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium mb-2">פגישה לא נמצאה</p>
                  <Button onClick={handleBack} variant="outline" className="mt-4">
                    חזור לרשימת פגישות
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const meetingData = meeting.meeting_data || {};
  const customer = meeting.customer;

    
    }

  let meetingDate = null;

    try {
    try {
      }
    } catch (e) {
    }
  }

        }
      } catch (e) {
      }
    }
  }


  const status = meetingData.status || meetingData['סטטוס'] || 'פעיל';
  const location = meetingData.location || meetingData['מיקום'] || meetingData['מקום'];
  const notes = meetingData.notes || meetingData['הערות'] || meetingData['תיאור'];

  const getStatusColor = (status: string) => {
    const statusStr = String(status);
    if (statusStr.includes('בוטל') || statusStr.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusStr.includes('הושלם') || statusStr.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
    if (statusStr.includes('מתוכנן') || statusStr.includes('תוכנן')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <>
      <DashboardHeader 
        userEmail={user?.email} 
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
      />
          
      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
        <main 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
                        <Button
                          variant="ghost"
                        >
                        </Button>
                    </div>
                    <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {location && (
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

                  </div>
                </div>
                  <div>
                  </div>
                  <div>
                  </div>
                    </div>
                  )}
                    <div>
                    </div>
                </div>
              </Card>
                    )}
                      </div>
                  </div>
              </Card>
                    </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MeetingDetailView;
