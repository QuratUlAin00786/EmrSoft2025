import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import type { Appointment } from "@/types";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800"
};

const typeColors = {
  consultation: "bg-purple-100 text-purple-800",
  follow_up: "bg-orange-100 text-orange-800",
  procedure: "bg-cyan-100 text-cyan-800"
};

export default function AppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: true,
  });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: Appointment) => 
      isSameDay(new Date(apt.scheduledAt), date)
    );
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={viewMode === "month" ? "bg-medical-blue text-white" : ""}
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={viewMode === "week" ? "bg-medical-blue text-white" : ""}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className={viewMode === "day" ? "bg-medical-blue text-white" : ""}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {format(selectedDate, "MMMM yyyy")}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-1 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-2 text-sm font-medium text-center text-gray-500">
                  {day}
                </div>
              ))}
              {calendarDays.map(day => {
                const dayAppointments = getAppointmentsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      p-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors
                      ${isSelected ? "bg-blue-100 border-blue-300" : "border-gray-200"}
                      ${isCurrentDay ? "bg-blue-50 font-semibold" : ""}
                    `}
                  >
                    <div className="text-center">
                      <div className={isCurrentDay ? "text-blue-600" : ""}>
                        {format(day, "d")}
                      </div>
                      {dayAppointments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-center">
                          {dayAppointments.slice(0, 2).map((apt, index) => (
                            <div
                              key={index}
                              className="w-2 h-2 rounded-full bg-blue-500"
                            />
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayAppointments.length - 2}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="mb-4">
              <div className="text-center font-medium text-gray-700 mb-4">
                Week View - {format(selectedDate, "MMMM yyyy")}
              </div>
              <div className="grid grid-cols-8 gap-1">
                <div className="p-2 text-sm font-medium text-gray-500">Time</div>
                {Array.from({ length: 7 }, (_, i) => {
                  const weekStart = new Date(selectedDate);
                  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                  return (
                    <div key={i} className="p-2 text-sm font-medium text-center text-gray-500">
                      <div>{format(weekStart, "EEE")}</div>
                      <div className="text-xs">{format(weekStart, "MMM d")}</div>
                    </div>
                  );
                })}
                {Array.from({ length: 12 }, (_, hour) => {
                  const timeSlot = hour + 8;
                  return (
                    <div key={hour} className="contents">
                      <div className="p-2 text-sm text-gray-500">
                        {timeSlot.toString().padStart(2, '0')}:00
                      </div>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const weekDay = new Date(selectedDate);
                        weekDay.setDate(selectedDate.getDate() - selectedDate.getDay() + dayIndex);
                        const dayAppointments = getAppointmentsForDate(weekDay);
                        const hourAppointments = dayAppointments.filter((apt: any) => 
                          new Date(apt.scheduledAt).getHours() === timeSlot
                        );
                        return (
                          <div key={dayIndex} className="p-1 border border-gray-200 min-h-[60px]">
                            {hourAppointments.map((apt: any) => (
                              <div key={apt.id} className="text-xs p-1 bg-medical-blue text-white rounded mb-1">
                                Patient {apt.patientId}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "day" && (
            <div className="mb-4">
              <div className="text-center font-medium text-gray-700 mb-4">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 12 }, (_, hour) => {
                  const timeSlot = hour + 8;
                  const hourAppointments = selectedDateAppointments.filter((apt: any) => 
                    new Date(apt.scheduledAt).getHours() === timeSlot
                  );
                  return (
                    <div key={hour} className="flex items-start border-b border-gray-100 py-2">
                      <div className="w-16 text-sm text-gray-500 pt-1">
                        {timeSlot.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 ml-4">
                        {hourAppointments.length > 0 ? (
                          hourAppointments.map((apt: any) => (
                            <div key={apt.id} className="p-3 bg-medical-blue text-white rounded mb-2">
                              <div className="font-medium">Patient ID: {apt.patientId}</div>
                              <div className="text-sm">{apt.type}</div>
                              <div className="text-xs">
                                {format(new Date(apt.scheduledAt), "h:mm a")} ({apt.duration} min)
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-sm py-2">No appointments</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>
            Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No appointments scheduled for this date
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDateAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{appointment.title}</h4>
                        <Badge className={statusColors[appointment.status]}>
                          {appointment.status}
                        </Badge>
                        <Badge className={typeColors[appointment.type]}>
                          {appointment.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.scheduledAt), "h:mm a")} 
                          ({appointment.duration} min)
                        </div>
                        {appointment.isVirtual ? (
                          <div className="flex items-center gap-1">
                            <Video className="h-4 w-4" />
                            Virtual
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.location || "In-person"}
                          </div>
                        )}
                      </div>
                      
                      {appointment.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {appointment.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        Patient ID: {appointment.patientId}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {appointment.status === "scheduled" && (
                        <Button size="sm">
                          Start Consultation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}