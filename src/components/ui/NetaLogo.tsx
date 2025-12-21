import { cn } from '@/lib/utils';

interface NetaLogoProps {
  /**
   * Size variant of the logo
   * @default "default"
   */
  size?: 'sm' | 'default' | 'md' | 'lg';
  /**
   * Border variant - controls border color/opacity
   * @default "default"
   */
  variant?: 'default' | 'light' | 'dark';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Logo source URL
   * @default "https://dietneta.com/wp-content/uploads/2025/08/logo.svg"
   */
  src?: string;
  /**
   * Alt text for the logo
   * @default "Diet Neta Logo"
   */
  alt?: string;
}

const sizeClasses = {
  sm: 'h-6 w-auto max-w-[120px]',
  default: 'h-9 w-auto max-w-[224px]',
  md: 'h-12 w-auto max-w-[280px]',
  lg: 'h-16 w-auto max-w-[320px]',
};

const variantClasses = {
  default: 'border-gray-200 bg-white',
  light: 'border-gray-100 bg-gray-50',
  dark: 'border-gray-300 bg-white',
};

export const NetaLogo = ({
  size = 'default',
  variant = 'default',
  className,
  src = 'https://dietneta.com/wp-content/uploads/2025/08/logo.svg',
  alt = 'Diet Neta Logo',
}: NetaLogoProps) => {
  return (
    <div
      className={cn(
        'p-3 border-2 rounded-2xl transition-all duration-300 shadow-sm',
        variantClasses[variant],
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'object-contain transition-opacity duration-300',
          sizeClasses[size]
        )}
        style={{ filter: 'none' }}
      />
    </div>
  );
};

