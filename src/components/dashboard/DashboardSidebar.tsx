import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  onInterfacesClick?: () => void;
  onPagesClick?: () => void;
}

export const DashboardSidebar = ({
  onInterfacesClick,
  onPagesClick,
}: DashboardSidebarProps) => {
  return (
    <aside className="w-64 bg-white text-gray-900 p-4 flex flex-col gap-3 shadow-sm border-l border-gray-200">
      <Button
        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl py-6 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover-lift"
        onClick={onInterfacesClick}
      >
        ממשקים
      </Button>
      <Button
        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl py-6 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover-lift"
        onClick={onPagesClick}
      >
        דפים
      </Button>
    </aside>
  );
};

