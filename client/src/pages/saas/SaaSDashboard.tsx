import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Building2, 
  CreditCard, 
  Package, 
  Settings, 
  LogOut,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import curaLogoPath from '@assets/Cura Logo Main AI_1755589894912.png';
import SaaSUsers from './components/SaaSUsers';
import SaaSCustomers from './components/SaaSCustomers';
import SaaSBilling from './components/SaaSBilling';
import SaaSPackages from './components/SaaSPackages';
import SaaSSettings from './components/SaaSSettings';

interface SaaSDashboardProps {
  onLogout: () => void;
}

export default function SaaSDashboard({ onLogout }: SaaSDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/saas/stats'],
  });

  const handleLogout = () => {
    localStorage.removeItem('saas_token');
    onLogout();
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">{trendValue}</span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src={curaLogoPath} 
                alt="Cura Software Limited" 
                className="h-10 w-auto"
              />
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  SaaS Administration Portal
                </h1>
              </div>
              <Badge variant="destructive" className="text-xs">
                OWNER ONLY
              </Badge>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Customers</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Packages</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Customers"
                value={stats?.totalCustomers || 0}
                icon={Building2}
                trend={true}
                trendValue="+12% this month"
              />
              <StatCard
                title="Active Users"
                value={stats?.activeUsers || 0}
                icon={Users}
                trend={true}
                trendValue="+8% this month"
              />
              <StatCard
                title="Monthly Revenue"
                value={`£${stats?.monthlyRevenue || 0}`}
                icon={CreditCard}
                trend={true}
                trendValue="+15% this month"
              />
              <StatCard
                title="Active Packages"
                value={stats?.activePackages || 0}
                icon={Package}
              />
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Recent Activity & Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No recent activity to display
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <SaaSUsers />
          </TabsContent>

          <TabsContent value="customers">
            <SaaSCustomers />
          </TabsContent>

          <TabsContent value="billing">
            <SaaSBilling />
          </TabsContent>

          <TabsContent value="packages">
            <SaaSPackages />
          </TabsContent>

          <TabsContent value="settings">
            <SaaSSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}