import { Globe } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import curaIconPath from "@assets/Cura Icon Main_1751893631980.png";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { tenant } = useTenant();
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-neutral-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-neutral-600 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* AI Status Indicator */}
          {tenant?.settings?.features?.aiEnabled && (
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">AI Assistant Active</span>
            </div>
          )}
          
          {/* Regional Settings */}
          <div className="flex items-center space-x-2 bg-neutral-50 px-3 py-2 rounded-lg">
            <Globe className="h-4 w-4 text-neutral-600" />
            <span className="text-sm text-neutral-700">
              {tenant?.region}/{tenant?.settings?.compliance?.gdprEnabled ? "GDPR" : "Standard"}
            </span>
          </div>
          
          {/* Notifications */}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
