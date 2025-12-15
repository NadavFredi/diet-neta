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
    <header 
      className="fixed top-0 left-0 right-0 bg-white text-gray-900 flex items-center shadow-sm border-b border-gray-200 z-40"
      style={{ height: '88px' }}
      dir="rtl"
    >
      {/* Logo container - matches sidebar width exactly (w-64 = 256px) - appears on right */}
      <div 
        className="flex-shrink-0 flex items-center justify-center"
        style={{ 
          width: '256px', // w-64 = 256px - matches sidebar exactly
          height: '100%',
          padding: '20px 16px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <img 
          src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg" 
          alt="Diet Neta Logo" 
          style={{
            height: '40px',
            width: 'auto',
            maxWidth: '224px', // 256px - 32px padding (16px each side)
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Main content area - takes remaining space, user info on left */}
      <div className="flex-1 flex items-center justify-end px-6 py-5">
        {/* User info and logout - positioned on left side (appears on left in RTL) */}
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
      </div>
    </header>
  );
};

