import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  userEmail: string | undefined;
  onLogout: () => void;
}

export const DashboardHeader = ({
  userEmail,
  onLogout,
}: DashboardHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white text-gray-900 px-6 py-5 flex items-center justify-between gap-4 shadow-sm border-b border-gray-200 z-40">
      {/* Left side - Neta logo only (appears on right in RTL) */}
      <div className="flex items-center flex-shrink-0 pr-2">
        <img 
          src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg" 
          alt="Diet Neta Logo" 
          className="h-14 w-auto object-contain max-h-14"
        />
      </div>

      {/* Right side - User info and logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
          <span className="text-base font-semibold text-gray-700">{userEmail}</span>
        </div>
        <Button 
          variant="ghost" 
          size="default" 
          onClick={onLogout} 
          className="text-base font-semibold text-gray-700 hover:bg-gray-100 transition-all rounded-lg px-4 py-2"
        >
          התנתק
        </Button>
      </div>
    </header>
  );
};

