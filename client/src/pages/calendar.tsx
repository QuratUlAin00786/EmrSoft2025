import { Header } from "@/components/layout/header";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { DoctorList } from "@/components/doctors/doctor-list";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Users } from "lucide-react";
import { useState } from "react";

export default function CalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  return (
    <>
      <Header 
        title="Appointment Calendar" 
        subtitle="Schedule and manage patient appointments efficiently."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar & Scheduling
            </h3>
            <p className="text-sm text-neutral-600">
              View appointments, manage schedules, and book new consultations.
            </p>
          </div>
          <Button className="bg-medical-blue hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Calendar - 2 columns */}
          <div className="lg:col-span-2">
            <AppointmentCalendar />
          </div>
          
          {/* Doctor List - 1 column */}
          <div>
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                Available Doctors
              </h4>
            </div>
            <DoctorList 
              onSelectDoctor={setSelectedDoctor}
              showAppointmentButton={true}
            />
          </div>
        </div>

        {selectedDoctor && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">
              Selected: Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
            </h5>
            <p className="text-sm text-blue-700">
              {selectedDoctor.department} - Ready to book appointment
            </p>
          </div>
        )}
      </div>
    </>
  );
}