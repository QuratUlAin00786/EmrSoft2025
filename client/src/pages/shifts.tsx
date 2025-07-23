import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Users, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShiftsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate time slots (24 hours in 1-hour intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeString = hour.toString().padStart(2, '0') + ':00';
      const displayTime = hour === 0 ? '12:00am' : 
                         hour < 12 ? `${hour}:00am` : 
                         hour === 12 ? '12:00pm' : 
                         `${hour - 12}:00pm`;
      slots.push({ value: timeString, display: displayTime, hour });
    }
    return slots;
  }, []);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  // Role options
  const roleOptions = [
    { value: 'doctor', label: 'Doctor' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'lab_technician', label: 'Lab Technician' },
    { value: 'admin', label: 'Admin' },
    { value: 'receptionist', label: 'Receptionist' }
  ];

  // Fetch medical staff with explicit query function
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/medical-staff");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("❌ Medical staff fetch error:", error);
        throw error;
      }
    },
  });

  // Fetch shifts for selected date
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ["/api/shifts", selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/shifts?date=${selectedDate}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("❌ Shifts fetch error:", error);
        throw error;
      }
    },
  });

  // Filter staff by selected role
  const filteredStaff = useMemo(() => {
    if (!selectedRole) return staff;
    return staff.filter((member: any) => member.role === selectedRole);
  }, [staff, selectedRole]);

  // Check if time slot is booked for selected staff member and date
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!selectedStaffId || !selectedDate) return false;
    
    return shifts.some((shift: any) => 
      shift.staffId === parseInt(selectedStaffId) &&
      shift.date === selectedDate &&
      shift.startTime === timeSlot &&
      shift.status !== 'cancelled'
    );
  };

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift scheduled successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchShifts();
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule shift",
        variant: "destructive",
      });
    },
  });

  // Reset form function
  const resetForm = () => {
    setSelectedRole("");
    setSelectedStaffId("");
    setSelectedTimeSlot("");
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (timeSlot: string) => {
    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a role and staff member first",
        variant: "destructive",
      });
      return;
    }
    
    if (isTimeSlotBooked(timeSlot)) {
      toast({
        title: "Time Slot Unavailable",
        description: "This time slot is already booked for the selected staff member",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedTimeSlot(timeSlot);
  };

  // Handle create shift
  const handleCreateShift = () => {
    if (!selectedStaffId || !selectedTimeSlot || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please select role, staff member, date, and time slot",
        variant: "destructive",
      });
      return;
    }

    const shiftData = {
      staffId: parseInt(selectedStaffId),
      date: selectedDate,
      startTime: selectedTimeSlot,
      endTime: (parseInt(selectedTimeSlot.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
      shiftType: "regular",
      status: "scheduled",
      isAvailable: true,
      notes: `Scheduled via calendar interface`
    };

    createShiftMutation.mutate(shiftData);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Format month display
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const currentYear = currentMonth.getFullYear();

  // Day names
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
            <p className="text-gray-600">Manage doctor and staff schedules, availability, and absences</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          View shifts for: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900">{shifts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CalendarCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {shifts.filter((s: any) => s.isAvailable && s.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">On Call</p>
              <p className="text-2xl font-bold text-gray-900">
                {shifts.filter((s: any) => s.shiftType === 'on_call').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-gray-900">
                {shifts.filter((s: any) => s.shiftType === 'absent' || s.status === 'absent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Shift Button */}
      <div className="mb-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Select a Date & Time</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side - Role/Name Selection & Calendar */}
              <div className="space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Name</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStaff.map((member: any) => {
                        const prefix = member.role === 'doctor' ? 'Dr.' : 
                                     member.role === 'nurse' ? 'Nurse' : 
                                     member.role === 'lab_technician' ? 'Lab Tech' : '';
                        return (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {prefix} {member.firstName} {member.lastName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousMonth}
                      className="p-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentMonthName} {currentYear}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextMonth}
                      className="p-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isSelected = selectedDate === day.toISOString().split('T')[0];
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day.toISOString().split('T')[0])}
                          className={`
                            h-10 w-10 text-sm rounded-lg transition-colors duration-150
                            ${isSelected 
                              ? 'bg-blue-600 text-white' 
                              : isToday 
                                ? 'bg-blue-100 text-blue-800 font-medium'
                                : isCurrentMonth 
                                  ? 'text-gray-900 hover:bg-gray-100' 
                                  : 'text-gray-400'
                            }
                          `}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side - Time Slots */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                </h4>
                
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {timeSlots.map((slot) => {
                    const isBooked = isTimeSlotBooked(slot.value);
                    const isSelected = selectedTimeSlot === slot.value;
                    
                    return (
                      <button
                        key={slot.value}
                        onClick={() => handleTimeSlotSelect(slot.value)}
                        disabled={isBooked}
                        className={`
                          p-3 rounded-lg border-2 text-sm font-medium transition-all duration-150
                          ${isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : isBooked
                              ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                              : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 hover:border-green-300'
                          }
                        `}
                      >
                        {slot.display}
                      </button>
                    );
                  })}
                </div>

                {/* Confirm Button */}
                {selectedTimeSlot && (
                  <div className="mt-6 pt-4 border-t">
                    <Button
                      onClick={handleCreateShift}
                      disabled={createShiftMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {createShiftMutation.isPending ? 'Scheduling...' : 'Confirm'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Shifts for {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        
        {shiftsLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading shifts...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts scheduled for this date</h3>
            <p className="text-gray-600 mb-4">Click "Schedule Shift" to add a new shift</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {shifts.map((shift: any) => {
              const staffMember = staff.find((s: any) => s.id === shift.staffId);
              const staffName = staffMember 
                ? `${staffMember.role === 'doctor' ? 'Dr.' : ''} ${staffMember.firstName} ${staffMember.lastName}`
                : 'Unknown Staff';
              
              return (
                <div key={shift.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{staffName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shift.shiftType === 'regular' ? 'bg-blue-100 text-blue-800' :
                        shift.shiftType === 'overtime' ? 'bg-purple-100 text-purple-800' :
                        shift.shiftType === 'on_call' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {shift.shiftType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shift.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                        shift.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {shift.status.toUpperCase()}
                      </span>
                      {shift.isAvailable && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          AVAILABLE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                      {shift.notes && (
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>{shift.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}