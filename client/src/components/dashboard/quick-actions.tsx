import { UserPlus, CalendarPlus, Bot, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    title: "Add New Patient",
    icon: UserPlus,
    color: "text-medical-blue",
    action: "addPatient"
  },
  {
    title: "Schedule Appointment", 
    icon: CalendarPlus,
    color: "text-medical-green",
    action: "scheduleAppointment"
  },
  {
    title: "AI Assistant Chat",
    icon: Bot,
    color: "text-purple-600", 
    action: "aiChat"
  },
  {
    title: "Create Prescription",
    icon: Pill,
    color: "text-medical-orange",
    action: "prescribe"
  }
];

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    } else {
      console.log(`Quick action: ${action}`);
      // Default implementations would go here
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => (
          <Button
            key={action.action}
            variant="outline"
            className="w-full justify-start space-x-3 h-auto p-3 hover:bg-neutral-50 transition-colors"
            onClick={() => handleAction(action.action)}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-sm font-medium text-gray-900">
              {action.title}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
