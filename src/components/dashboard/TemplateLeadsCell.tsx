import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTemplateLeads } from '@/hooks/useTemplateLeads';

export const TemplateLeadsCell = ({ templateId }: { templateId: string }) => {
  const { data: leads = [], isLoading } = useTemplateLeads(templateId);
  const navigate = useNavigate();

  if (isLoading) {
    return <span className="text-gray-400 text-sm">טוען...</span>;
  }

  if (leads.length === 0) {
    return <span className="text-gray-400 text-sm">אין לידים מחוברים</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-blue-50 text-blue-600 hover:text-blue-700"
        >
          <Users className="h-4 w-4 ml-1" />
          <span>{leads.length} ליד{leads.length > 1 ? 'ים' : ''}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" dir="rtl">
        <div className="space-y-2">
          <div className="font-semibold text-sm mb-3 pb-2 border-b">
            לידים מחוברים לתוכנית זו
            <p className="text-xs font-normal text-gray-500 mt-1">
              שינוי התוכנית לא ישפיע על התוכניות הקיימות של הלידים
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {leads.map((lead) => (
              <div
                key={lead.plan_id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group"
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {lead.lead_name}
                  </div>
                  {lead.lead_email && (
                    <div className="text-xs text-gray-500 truncate">
                      {lead.lead_email}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    נוצר: {format(new Date(lead.plan_created_at), 'dd/MM/yyyy', { locale: he })}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mr-2" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};











