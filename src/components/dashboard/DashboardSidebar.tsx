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
    <aside className="w-64 bg-[#1e3a5f] text-white p-4 flex flex-col gap-4">
      <Button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        onClick={onInterfacesClick}
      >
        ממשקים
      </Button>
      <Button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        onClick={onPagesClick}
      >
        דפים
      </Button>
    </aside>
  );
};

