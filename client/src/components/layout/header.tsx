import { Globe, ArrowLeft } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CurrencySelector } from "@/components/currency-selector";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const curaIconPath = "/emr-logo.png";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const handleBack = () => {
    window.history.back();
  };

  const showBackButton = location !== "/" && location !== "/dashboard";

  return (
    <header className="bg-white dark:bg-card shadow-sm border-b border-neutral-100 dark:border-border p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground truncate">{title}</h2>
            {subtitle && (
              <p className="text-neutral-600 dark:text-muted-foreground mt-1 text-sm lg:text-base truncate">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4 shrink-0">
          {/* AI Status Indicator */}
          {tenant?.settings?.features?.aiEnabled && (
            <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-900 px-2 lg:px-3 py-1 lg:py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs lg:text-sm text-green-700 dark:text-green-200">AI Active</span>
            </div>
          )}
          
          {/* Currency Selector */}
          <div className="hidden sm:block">
            <CurrencySelector />
          </div>
          
          {/* Regional Settings */}
          <div className="hidden sm:flex items-center space-x-1 lg:space-x-2 bg-neutral-50 dark:bg-neutral-800 px-2 lg:px-3 py-1 lg:py-2 rounded-lg">
            <Globe className="h-3 lg:h-4 w-3 lg:w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="text-xs lg:text-sm text-neutral-700 dark:text-neutral-300">
              {tenant?.region?.substring(0, 2)}/{tenant?.settings?.compliance?.gdprEnabled ? "GDPR" : "Std"}
            </span>
          </div>
          
          {/* Notifications */}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
