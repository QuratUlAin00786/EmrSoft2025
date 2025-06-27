import React, { useEffect, useState } from "react";
import { Users, Calendar, Brain, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { DashboardStats } from "@/types";

const statCards = [
  {
    title: "Total Patients",
    key: "totalPatients" as keyof DashboardStats,
    icon: Users,
    color: "text-medical-blue",
    bgColor: "bg-blue-100",
    change: "+12% this month",
    changeColor: "text-green-600"
  },
  {
    title: "Today's Appointments",
    key: "todayAppointments" as keyof DashboardStats,
    icon: Calendar,
    color: "text-medical-green",
    bgColor: "bg-green-100",
    change: "8 remaining",
    changeColor: "text-blue-600"
  },
  {
    title: "AI Suggestions",
    key: "aiSuggestions" as keyof DashboardStats,
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    change: "This week",
    changeColor: "text-purple-600"
  },
  {
    title: "Revenue (MTD)",
    key: "revenue" as keyof DashboardStats,
    icon: DollarSign,
    color: "text-medical-orange",
    bgColor: "bg-orange-100",
    change: "+8.2% vs last month",
    changeColor: "text-green-600",
    prefix: "£"
  }
];

export function StatsOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'X-Tenant-Subdomain': 'demo'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);



  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="dashboard-card">
            <CardContent className="flex items-center justify-center h-24">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Card key={card.title} className="dashboard-card">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
                <p className="text-neutral-500 text-sm mt-1">Data unavailable</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.color} text-xl h-6 w-6`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card) => {
        const value = stats?.[card.key] ?? 0;
        const formattedValue = card.prefix 
          ? `${card.prefix}${value.toLocaleString()}`
          : value.toLocaleString();



        return (
          <Card key={card.title} className="dashboard-card hover:shadow-md transition-shadow">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-neutral-600 text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formattedValue}
                </p>
                <p className={`text-sm mt-1 ${card.changeColor}`}>
                  {card.change}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.color} text-xl h-6 w-6`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
