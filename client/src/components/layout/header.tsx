import { Bell, Globe } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import haloLogoPath from "@assets/Screenshot 2025-06-25 at 12.40.02_1750837361778.png";

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
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-neutral-600" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
