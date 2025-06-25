import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Brain, 
  CreditCard, 
  UserCog, 
  Settings, 
  Heart,
  Crown,
  FileText,
  Pill,
  FlaskConical,
  Stethoscope,
  FileImage,
  Receipt
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import haloLogoPath from "@assets/Screenshot 2025-06-25 at 12.40.02_1750837361778.png";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Prescriptions", href: "/prescriptions", icon: Pill },
  { name: "Lab Results", href: "/lab-results", icon: FlaskConical },
  { name: "Imaging", href: "/imaging", icon: FileImage },
  { name: "Forms", href: "/forms", icon: FileText, badge: "NEW" },
  { name: "AI Insights", href: "/ai-insights", icon: Brain },
  { name: "Billing", href: "/billing", icon: Receipt },
];

const adminNavigation = [
  { name: "User Management", href: "/users", icon: UserCog },
  { name: "Subscription", href: "/subscription", icon: Crown },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { tenant } = useTenant();
  const { user, logout } = useAuth();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isAdmin = user?.role === "admin";

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          <img 
            src={haloLogoPath} 
            alt="Halo Health" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {tenant?.brandName || "Halo Health"}
            </h1>
            <p className="text-xs text-neutral-600">
              {tenant?.region} Healthcare
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="sidebar-nav">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "sidebar-nav-item",
                  isActive && "active"
                )}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-medical-orange text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </a>
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 mt-4">
              <Separator />
            </div>
            <div className="pt-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2 px-3">
                Administration
              </p>
              <div className="sidebar-nav">
                {adminNavigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.name} href={item.href}>
                      <a className={cn(
                        "sidebar-nav-item",
                        isActive && "active"
                      )}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-neutral-100">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarContent className="bg-medical-green text-white font-semibold">
              {user ? getInitials(user.firstName, user.lastName) : "U"}
            </AvatarContent>
            <AvatarFallback>
              {user ? getInitials(user.firstName, user.lastName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Unknown User"}
            </p>
            <p className="text-xs text-neutral-600 truncate">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-neutral-600 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
