import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Calendar, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function SampleTakerDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const sampleTakerCards = [
    {
      title: "Samples Today",
      value: "15",
      description: "Collections scheduled",
      icon: FlaskConical,
      href: "/lab-results",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Pending Results",
      value: "8",
      description: "Processing in lab",
      icon: Clock,
      href: "/lab-results",
      color: "bg-orange-100 text-orange-800"
    },
    {
      title: "Completed Today",
      value: "12",
      description: "Samples processed",
      icon: CheckCircle,
      href: "/lab-results",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Priority Samples",
      value: "3",
      description: "Urgent processing",
      icon: AlertCircle,
      href: "/lab-results",
      color: "bg-red-100 text-red-800"
    }
  ];

  const quickActions = [
    { title: "Sample Collection", description: "Record new sample collection", icon: FlaskConical, href: "/lab-results" },
    { title: "Lab Schedule", description: "View collection schedule", icon: Calendar, href: "/appointments" },
    { title: "Patient Lookup", description: "Find patient for sample", icon: Users, href: "/patients" },
    { title: "Quality Control", description: "Review sample quality", icon: CheckCircle, href: "/lab-results" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lab Technician Dashboard</h1>
        <p className="text-neutral-600">
          Laboratory sample collection and processing coordination
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleTakerCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-neutral-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={action.href}>
                  <Button className="w-full" variant="outline">Access</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sample Collection Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Collection Schedule</CardTitle>
            <CardDescription>Scheduled sample collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">Blood Sample - STAT</p>
                    <p className="text-sm text-neutral-600">Room 205 - Sarah Johnson</p>
                  </div>
                </div>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Urgent</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FlaskConical className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Urine Sample</p>
                    <p className="text-sm text-neutral-600">Room 103 - Robert Davis</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">11:00 AM</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FlaskConical className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Blood Panel</p>
                    <p className="text-sm text-neutral-600">Room 208 - Emily Watson</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">2:00 PM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Status</CardTitle>
            <CardDescription>Current processing status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Samples Collected</span>
                  <span>12/15</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: '80%' }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing Complete</span>
                  <span>8/12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: '67%' }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Results Pending</span>
                  <span>4/12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: '33%' }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}