import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, CalendarCheck, ChevronLeft, ChevronRight, UserCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShiftsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAvailabilityDay, setSelectedAvailabilityDay] = useState(new Date());
  // Initialize time slot selection state
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pre-select time slots from 10:00 AM to 3:00 PM only once on initial load
  useEffect(() => {
    if (!hasInitialized) {
      console.log("Initial pre-selection: setting time slots 1000-1500");
      setSelectedTimeSlots([1000, 1100, 1200, 1300, 1400, 1500]);
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Clear pre-selected time slots when staff member is selected
  useEffect(() => {
    if (selectedStaffId) {
      setSelectedTimeSlots([]);
      setSelectedStartTime("");
      setSelectedEndTime("");
      setIsSelectingRange(false);
    }
  }, [selectedStaffId]);

  // Clear time slot selections when date changes to prevent cross-date confusion
  useEffect(() => {
    console.log("Selected date changed to:", selectedDate.toDateString(), selectedDate);
    setSelectedTimeSlots([]);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setIsSelectingRange(false);
  }, [selectedDate]);

  // Refetch shifts when availability modal date changes
  useEffect(() => {
    if (showAvailability && selectedAvailabilityDay) {
      console.log("Availability modal date changed to:", selectedAvailabilityDay.toDateString(), "Refetching shifts...");
      // Invalidate queries for both the old and new date to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      // Also invalidate the specific query key pattern
      const newDateString = selectedAvailabilityDay.toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", newDateString] });
      refetchShifts();
    }
  }, [selectedAvailabilityDay, showAvailability]);



  // Role options exactly as requested
  const roleOptions = [
    { value: 'doctor', label: 'Doctor' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'lab_technician', label: 'Lab Technician' },
    { value: 'admin', label: 'Admin' },
    { value: 'receptionist', label: 'Receptionist' }
  ];

  // Generate dynamic time slots based on shift data (excluding absent shifts)
  const generateTimeSlots = (doctorShifts: any[]): { value: number; display: string; hour: number; shiftId: any }[] => {
    if (!doctorShifts || doctorShifts.length === 0) {
      // Return empty array if no shifts
      return [];
    }

    const slots: { value: number; display: string; hour: number; shiftId: any }[] = [];
    
    // For each shift, generate hourly slots within the shift duration (skip absent shifts)
    doctorShifts.forEach((shift: any) => {
      // Skip absent shifts - they should not generate time slots
      if (shift.shiftType === 'absent' || shift.status === 'absent') {
        return;
      }
      let startHour, endHour;
      
      // Parse start time
      if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
        startHour = parseInt(shift.startTime.split(':')[0]);
      } else {
        startHour = Math.floor(parseInt(shift.startTime) / 100);
      }
      
      // Parse end time
      if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
        endHour = parseInt(shift.endTime.split(':')[0]);
      } else {
        endHour = Math.floor(parseInt(shift.endTime) / 100);
      }
      
      // Generate hourly slots for this shift
      for (let hour = startHour; hour < endHour; hour++) {
        const timeValue = hour * 100;
        const displayTime = hour === 0 ? '12:00 AM' : 
                           hour < 12 ? `${hour}:00 AM` : 
                           hour === 12 ? '12:00 PM' : 
                           `${hour - 12}:00 PM`;
        
        // Avoid duplicates
        if (!slots.find(s => s.value === timeValue)) {
          slots.push({ value: timeValue, display: displayTime, hour, shiftId: shift.id });
        }
      }
    });
    
    // Sort slots by time value
    return slots.sort((a, b) => a.value - b.value);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
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

  // Fetch medical staff
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/medical-staff");
        const data = await response.json();

        return Array.isArray(data.staff) ? data.staff : [];
      } catch (error) {
        console.error("Medical staff fetch error:", error);
        throw error;
      }
    },
  });

  // Helper function to get local date string (avoids timezone issues)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch shifts for selected date (use availability modal date when modal is open)
  const dateForQuery = showAvailability ? selectedAvailabilityDay : selectedDate;
  const queryDateString = getLocalDateString(dateForQuery);
  
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ["/api/shifts", queryDateString, showAvailability],
    queryFn: async () => {
      try {
        // Always use the current state values when the query runs
        const currentDate = showAvailability ? selectedAvailabilityDay : selectedDate;
        const dateString = getLocalDateString(currentDate);
        console.log("Query executing: fetching shifts for date:", dateString, "Modal open:", showAvailability);
        const response = await apiRequest("GET", `/api/shifts?date=${dateString}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Shifts fetch error:", error);
        throw error;
      }
    },
  });

  // Filter staff by selected role
  const filteredStaff = useMemo(() => {
    if (!selectedRole) return staff;
    return staff.filter((member: any) => member.role === selectedRole);
  }, [staff, selectedRole]);

  // Check if time slot is booked for selected staff member
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!selectedStaffId || !selectedDate) return false;
    
    const dateString = selectedDate.toISOString().split('T')[0];
    return shifts.some((shift: any) => 
      shift.staffId === parseInt(selectedStaffId) &&
      shift.date === dateString &&
      shift.startTime === timeSlot &&
      shift.status !== 'cancelled'
    );
  };

  // Handle time slot selection for start/end time range
  const handleTimeSlotClick = (timeSlot: string) => {
    if (!selectedRole) {
      toast({
        title: "Select Role First",
        description: "Please select a role before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStartTime) {
      // First click - set start time
      setSelectedStartTime(timeSlot);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    } else if (!selectedEndTime) {
      // Second click - set end time and create shift
      const startTimeValue = parseInt(selectedStartTime.replace(':', ''));
      const endTimeValue = parseInt(timeSlot.replace(':', ''));
      
      if (endTimeValue <= startTimeValue) {
        toast({
          title: "Invalid End Time",
          description: "End time must be after start time. Please select a later time.",
          variant: "destructive",
        });
        return;
      }
      setSelectedEndTime(timeSlot);
      handleCreateShift(selectedStartTime, timeSlot);
    } else {
      // Reset and start new selection
      setSelectedStartTime(timeSlot);
      setSelectedEndTime("");
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    }
  };

  // Create shift with selected start and end times
  const handleCreateShift = async (startTime: string, endTime: string) => {
    // Use local date formatting to avoid timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log("Creating shift for date:", dateString, "Selected date object:", selectedDate);
    
    try {
      const shiftData = {
        staffId: parseInt(selectedStaffId),
        date: dateString,
        startTime: startTime,
        endTime: endTime,
        shiftType: "regular",
        status: "scheduled",
        isAvailable: true,
        notes: `Scheduled ${startTime} - ${endTime} via shift management calendar`
      };

      const response = await apiRequest("POST", "/api/shifts", shiftData);
      if (response.ok) {
        toast({
          title: "Shift Scheduled",
          description: `Successfully scheduled ${startTime} - ${endTime} for selected staff member`,
        });
        
        // Keep selection to maintain dark green color
        // Selection will be reset when user clicks a new time slot
        
        // Force a fresh fetch by invalidating all shift-related queries
        await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        await refetchShifts();
      }
    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule the shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle time slot selection for shift range creation
  const handleTimeSlotSelection = (slotValue: number) => {
    if (!selectedRole) {
      toast({
        title: "Select Role First",
        description: "Please select a role before choosing time slots",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before choosing time slots",
        variant: "destructive",
      });
      return;
    }


    
    if (!selectedStartTime) {
      // First click - set start time and show only this slot as selected
      const timeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedStartTime(timeSlot);
      setSelectedTimeSlots([slotValue]);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected",
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    } else if (!selectedEndTime) {
      // Second click - set end time and create range  
      const startValue = parseInt(selectedStartTime.replace(':', ''));
      const endValue = slotValue;
      
      if (endValue <= startValue) {
        toast({
          title: "Invalid End Time",
          description: "End time must be after start time. Please select a later time.",
          variant: "destructive",
        });
        return;
      }
      
      // Create range of all slots between start and end
      const range = [];
      for (let i = startValue; i <= endValue; i += 100) {
        range.push(i);
      }
      
      const endTimeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedEndTime(endTimeSlot);
      setSelectedTimeSlots(range);
      
      // Create the shift
      handleCreateShift(selectedStartTime, endTimeSlot);
    } else {
      // Reset and start new selection
      const timeSlot = `${Math.floor(slotValue / 100).toString().padStart(2, '0')}:00`;
      setSelectedStartTime(timeSlot);
      setSelectedEndTime("");
      setSelectedTimeSlots([slotValue]);
      setIsSelectingRange(true);
      toast({
        title: "Start Time Selected", 
        description: `Start time set to ${timeSlot}. Now select end time.`,
      });
    }
  };

  // Handle clicking on doctor name to show availability
  const handleDoctorClick = async (staffId: number) => {
    console.log("Doctor clicked - Staff ID:", staffId, "Main calendar date:", selectedDate.toDateString(), selectedDate);
    setSelectedDoctorId(staffId.toString());
    setSelectedAvailabilityDay(selectedDate); // Sync modal date with main calendar date
    
    console.log("Setting modal date to:", selectedDate.toDateString(), "Will query for date:", selectedDate.toISOString().split('T')[0]);
    
    // Force complete refresh of shifts data with new key
    await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    await queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
    
    setShowAvailability(true);
  };

  // Handle marking staff as absent for the entire day
  const handleMarkAbsent = async () => {
    console.log("Mark Absent button clicked - Staff ID:", selectedStaffId, "Date:", selectedDate.toDateString());
    
    if (!selectedStaffId) {
      toast({
        title: "Select Staff Member",
        description: "Please select a staff member before marking absent",
        variant: "destructive",
      });
      return;
    }

    const dateString = getLocalDateString(selectedDate);
    console.log("Marking staff absent for date:", dateString);
    
    try {
      // Create an absence record for the entire day
      const absenceData = {
        staffId: parseInt(selectedStaffId),
        date: dateString,
        startTime: "00:00",
        endTime: "23:59",
        shiftType: "absent",
        status: "absent",
        isAvailable: false,
        notes: `Marked absent for entire day via shift management`
      };

      const response = await apiRequest("POST", "/api/shifts", absenceData);
      if (response.ok) {
        console.log("Successfully marked staff as absent, refreshing data...");
        toast({
          title: "Staff Marked Absent",
          description: `Successfully marked staff member as absent for ${selectedDate.toLocaleDateString()}`,
        });
        
        // Force complete data refresh
        await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        await refetchShifts();
      } else {
        console.error("Failed to mark staff absent - HTTP", response.status);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Operation Failed", 
        description: "Failed to mark staff as absent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting individual shifts
  const handleDeleteShift = async (shiftId: number) => {
    try {
      const response = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (response.ok) {
        toast({
          title: "Shift Deleted",
          description: "Successfully deleted the shift",
        });
        refetchShifts();
        queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the shift. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Navigation functions for calendar
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const currentYear = currentMonth.getFullYear();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shift Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage doctor and staff schedules, availability, and absences</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          View shifts for: <span className="font-medium text-gray-900 dark:text-gray-100">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Role and Name Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Role</h2>
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder="Choose a role..." />
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

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Name</h2>
          </div>
          <Select 
            value={selectedStaffId} 
            onValueChange={setSelectedStaffId}
            disabled={!selectedRole}
          >
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder={!selectedRole ? "Select a role first" : "Choose a staff member..."} />
            </SelectTrigger>
            <SelectContent>
              {filteredStaff.map((member: any) => (
                <SelectItem key={member.id} value={member.id.toString()}>
                  {member.role === 'doctor' ? 'Dr.' : ''} {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar and Time Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Date Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select a Date & Time</h2>
          </div>
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {currentMonthName} {currentYear}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDate.toDateString() === day.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-10 p-0 font-normal
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}
                    ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                    ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''}
                  `}
                  onClick={() => {
                    console.log("Calendar day clicked:", day.toDateString(), day);
                    setSelectedDate(day);
                  }}
                >
                  {day.getDate()}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          
          {!selectedStaffId ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">Select a staff member to view time slots</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Choose role and name from the dropdowns above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mark Absent Button */}
              <div className="flex justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMarkAbsent}
                  className="w-full"
                >
                  Mark Staff as Absent for Entire Day
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {Array.from({ length: 24 }, (_, hour) => ({ 
                  value: hour * 100, 
                  display: hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`, 
                  hour 
                })).map((slot) => {
                  const dateString = selectedDate.toISOString().split('T')[0];
                  
                  // Check if this hour slot has a scheduled shift for the selected staff member
                  const hasShift = shifts.some((shift: any) => {
                    if (shift.staffId !== parseInt(selectedStaffId) || shift.date !== dateString || shift.status === 'cancelled') {
                      return false;
                    }
                    // Convert time formats for comparison
                    const shiftStart = typeof shift.startTime === 'string' && shift.startTime.includes(':') 
                      ? parseInt(shift.startTime.replace(':', ''))
                      : parseInt(shift.startTime);
                    const shiftEnd = typeof shift.endTime === 'string' && shift.endTime.includes(':')
                      ? parseInt(shift.endTime.replace(':', ''))
                      : parseInt(shift.endTime);
                    return slot.value >= shiftStart && slot.value < shiftEnd;
                  });
                  
                  // Check if this time slot is selected
                  const isSelected = selectedTimeSlots.includes(slot.value);
                  

                  
                  return (
                    <Button
                      key={slot.value}
                      variant="outline"
                      className={`
                        h-12 justify-center font-medium transition-all cursor-pointer text-sm
                        ${isSelected
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-400 hover:from-green-500 hover:to-emerald-600'
                          : hasShift
                          ? 'bg-gradient-to-r from-purple-400 to-violet-500 text-white border-purple-400 hover:from-purple-500 hover:to-violet-600'
                          : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-blue-400 hover:from-blue-500 hover:to-cyan-500'
                        }
                      `}
                      onClick={() => handleTimeSlotSelection(slot.value)}
                    >
                      {slot.display}
                    </Button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="text-center text-gray-700 dark:text-gray-300 font-medium mb-3">
                  {!selectedStartTime && "Click a time slot to set start time"}
                  {selectedStartTime && !selectedEndTime && "Now select end time to complete shift"}
                  {selectedStartTime && selectedEndTime && "Shift scheduled! Click another slot to create new shift"}
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Scheduled Shifts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Selected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{shifts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <CalendarCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.isAvailable && s.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On Call</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.shiftType === 'on_call').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {shifts.filter((s: any) => s.shiftType === 'absent' || s.status === 'absent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
        <div className="p-6 border-b dark:border-slate-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Shifts for {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        
        {shiftsLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading shifts...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No shifts scheduled for this date</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Use the calendar above to schedule new shifts</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-600">
            {shifts
              .sort((a: any, b: any) => {
                // Sort by creation date (newest first), then by start time
                const dateA = new Date(a.createdAt || a.date);
                const dateB = new Date(b.createdAt || b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                  return dateB.getTime() - dateA.getTime(); // Newest first
                }
                // If same creation date, sort by start time
                const timeA = typeof a.startTime === 'string' && a.startTime.includes(':') 
                  ? parseInt(a.startTime.replace(':', ''))
                  : parseInt(a.startTime);
                const timeB = typeof b.startTime === 'string' && b.startTime.includes(':')
                  ? parseInt(b.startTime.replace(':', ''))
                  : parseInt(b.startTime);
                return timeA - timeB;
              })
              .map((shift: any) => {
              const staffMember = staff.find((s: any) => s.id === shift.staffId);
              const staffName = staffMember 
                ? `${staffMember.role === 'doctor' ? 'Dr.' : ''} ${staffMember.firstName} ${staffMember.lastName}`
                : 'Unknown Staff';
              
              return (
                <div key={shift.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 
                        className="text-lg font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline transition-colors"
                        onClick={() => handleDoctorClick(shift.staffId)}
                      >
                        {staffName}
                      </h3>
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
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
{shift.startTime}-{shift.endTime}
                      </div>
                      {shift.notes && <span>• {shift.notes}</span>}
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteShift(shift.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doctor Availability Modal */}
      {showAvailability && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-slate-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Doctor Availability</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAvailability(false)}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                const selectedDoctor = staff.find((s: any) => s.id.toString() === selectedDoctorId);
                if (!selectedDoctor) return <p className="text-gray-600 dark:text-gray-400">Doctor not found</p>;
                
                console.log("All shifts data:", shifts);
                console.log("Looking for doctor ID:", selectedDoctorId, "on date:", selectedAvailabilityDay.toDateString());
                
                const doctorShifts = shifts.filter((s: any) => {
                  // Use timezone-safe date comparison
                  const shiftDate = new Date(s.date);
                  const shiftDateString = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}-${String(shiftDate.getDate()).padStart(2, '0')}`;
                  
                  const selectedYear = selectedAvailabilityDay.getFullYear();
                  const selectedMonth = String(selectedAvailabilityDay.getMonth() + 1).padStart(2, '0');
                  const selectedDay = String(selectedAvailabilityDay.getDate()).padStart(2, '0');
                  const selectedDateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
                  
                  console.log("Checking shift:", s.id, "Staff ID:", s.staffId, "Date:", s.date, "Shift date string:", shiftDateString, "Selected date string:", selectedDateString, "Staff match:", s.staffId.toString() === selectedDoctorId, "Date match:", shiftDateString === selectedDateString);
                  return s.staffId.toString() === selectedDoctorId && shiftDateString === selectedDateString;
                });
                
                console.log("Filtered doctor shifts:", doctorShifts);
                
                return (
                  <div className="space-y-6">
                    {/* Doctor Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                        {selectedDoctor.role === 'doctor' ? 'Dr.' : ''} {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </h3>
                      <p className="text-blue-700 dark:text-blue-400">{selectedDoctor.email}</p>
                      <p className="text-blue-600 dark:text-blue-400 capitalize">{selectedDoctor.role}</p>
                    </div>

                    {/* Availability Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Available Hours</h4>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {(() => {
                            const totalHours = doctorShifts
                              .filter((s: any) => s.isAvailable && s.status === 'scheduled' && s.shiftType !== 'absent')
                              .reduce((total: number, shift: any) => {
                                let startHour, endHour;
                                
                                // Parse start time
                                if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
                                  startHour = parseInt(shift.startTime.split(':')[0]);
                                } else {
                                  startHour = Math.floor(parseInt(shift.startTime) / 100);
                                }
                                
                                // Parse end time
                                if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
                                  endHour = parseInt(shift.endTime.split(':')[0]);
                                } else {
                                  endHour = Math.floor(parseInt(shift.endTime) / 100);
                                }
                                
                                return total + (endHour - startHour);
                              }, 0);
                            return totalHours;
                          })()}h
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">This period</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-orange-800 dark:text-orange-300">On Call</h4>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {doctorShifts.filter((s: any) => s.shiftType === 'on_call').length}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Shifts</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                        <h4 className="text-lg font-semibold text-red-800 dark:text-red-300">Absent Hours</h4>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {(() => {
                            const absentHours = doctorShifts
                              .filter((s: any) => s.shiftType === 'absent' || s.status === 'absent')
                              .reduce((total: number, shift: any) => {
                                let startHour, endHour;
                                
                                // Parse start time
                                if (typeof shift.startTime === 'string' && shift.startTime.includes(':')) {
                                  startHour = parseInt(shift.startTime.split(':')[0]);
                                } else {
                                  startHour = Math.floor(parseInt(shift.startTime) / 100);
                                }
                                
                                // Parse end time  
                                if (typeof shift.endTime === 'string' && shift.endTime.includes(':')) {
                                  endHour = parseInt(shift.endTime.split(':')[0]);
                                } else {
                                  endHour = Math.floor(parseInt(shift.endTime) / 100);
                                }
                                
                                return total + (endHour - startHour);
                              }, 0);
                            return absentHours;
                          })()}h
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">Unavailable</p>
                      </div>
                    </div>

                    {/* Day Selection */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Day</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => {
                          // Calculate the date for this day of the week
                          const startOfWeek = new Date(selectedAvailabilityDay);
                          const day = startOfWeek.getDay();
                          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
                          startOfWeek.setDate(diff);
                          
                          const dayDate = new Date(startOfWeek);
                          dayDate.setDate(startOfWeek.getDate() + index);
                          
                          const isSelected = selectedAvailabilityDay.toDateString() === dayDate.toDateString();
                          
                          return (
                            <button
                              key={dayName}
                              onClick={() => setSelectedAvailabilityDay(dayDate)}
                              className={`p-3 rounded-lg border text-center font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600'
                              }`}
                            >
                              <div className="text-sm">{dayName}</div>
                              <div className="text-xs mt-1">{dayDate.getDate()}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Time Table based on Doctor's Shifts */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        {selectedDoctor.firstName}'s Available Time Slots - {selectedAvailabilityDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h4>
                      <div className="bg-white rounded-lg border p-4">
                        {(() => {
                          const hasRegularShifts = generateTimeSlots(doctorShifts).length > 0;
                          const hasAbsentShifts = doctorShifts.some((s: any) => s.shiftType === 'absent' || s.status === 'absent');
                          
                          if (!hasRegularShifts && !hasAbsentShifts) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p>No shifts scheduled for this doctor.</p>
                                <p className="text-sm mt-2">Schedule a shift to see available time slots.</p>
                              </div>
                            );
                          }
                          
                          if (!hasRegularShifts && hasAbsentShifts) {
                            return (
                              <div className="text-center py-8 text-red-500">
                                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                                  <div className="text-red-600 text-lg font-semibold mb-2">Staff Member Absent</div>
                                  <p className="text-red-700 text-sm">This staff member is marked as absent for this day.</p>
                                  <p className="text-red-600 text-sm font-medium mt-2">No available time slots.</p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                          <>
                            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                            {generateTimeSlots(doctorShifts).map((slot) => {
                            // Check if this doctor has a NON-ABSENT shift at this time (exclude absent shifts)
                            const hasShift = doctorShifts.some((shift: any) => {
                              // Skip absent shifts - they should not show as green available slots
                              if (shift.shiftType === 'absent' || shift.status === 'absent') {
                                return false;
                              }
                              
                              // Convert time formats for comparison - handle both "HHMM" and "HH:MM" formats
                              let shiftStart, shiftEnd;
                              
                              if (typeof shift.startTime === 'string') {
                                if (shift.startTime.includes(':')) {
                                  shiftStart = parseInt(shift.startTime.replace(':', ''));
                                } else if (shift.startTime.length === 4) {
                                  shiftStart = parseInt(shift.startTime);
                                } else {
                                  shiftStart = parseInt(shift.startTime.padStart(4, '0'));
                                }
                              } else {
                                shiftStart = parseInt(shift.startTime);
                              }
                              
                              if (typeof shift.endTime === 'string') {
                                if (shift.endTime.includes(':')) {
                                  shiftEnd = parseInt(shift.endTime.replace(':', ''));
                                } else if (shift.endTime.length === 4) {
                                  shiftEnd = parseInt(shift.endTime);
                                } else {
                                  shiftEnd = parseInt(shift.endTime.padStart(4, '0'));
                                }
                              } else {
                                shiftEnd = parseInt(shift.endTime);
                              }
                              
                              return slot.value >= shiftStart && slot.value <= shiftEnd;
                            });
                            
                            const handleSlotClick = async () => {
                              try {
                                const dateString = selectedAvailabilityDay.toISOString().split('T')[0];
                                
                                if (hasShift) {
                                  // Remove shift - find and delete the shift that contains this time slot
                                  const shiftToRemove = doctorShifts.find((shift: any) => {
                                    
                                    // Convert time formats for comparison
                                    const shiftStart = typeof shift.startTime === 'string' && shift.startTime.includes(':') 
                                      ? parseInt(shift.startTime.replace(':', ''))
                                      : parseInt(shift.startTime);
                                    const shiftEnd = typeof shift.endTime === 'string' && shift.endTime.includes(':')
                                      ? parseInt(shift.endTime.replace(':', ''))
                                      : parseInt(shift.endTime);
                                    
                                    return slot.value >= shiftStart && slot.value <= shiftEnd;
                                  });
                                  
                                  if (shiftToRemove) {
                                    const response = await fetch(`/api/shifts/${shiftToRemove.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                        'Content-Type': 'application/json',
                                      },
                                    });
                                    
                                    if (response.ok) {
                                      // Refresh shifts data using React Query
                                      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
                                      toast({
                                        title: "Success",
                                        description: "Shift removed successfully",
                                      });
                                    }
                                  }
                                } else {
                                  // Add new shift for this time slot (1 hour duration)
                                  const endTime = slot.value + 100; // Add 1 hour (100 in HHMM format)
                                  const shiftData = {
                                    staffId: parseInt(selectedDoctor.id),
                                    date: dateString,
                                    startTime: slot.value.toString().padStart(4, '0'),
                                    endTime: endTime.toString().padStart(4, '0'),
                                    shiftType: 'regular',
                                    status: 'scheduled',
                                    isAvailable: true,
                                    notes: 'Added from Doctor Availability modal'
                                  };
                                  
                                  const response = await fetch('/api/shifts', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(shiftData),
                                  });
                                  
                                  if (response.ok) {
                                    // Refresh shifts data using React Query
                                    queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
                                    toast({
                                      title: "Success",
                                      description: "Shift added successfully",
                                    });
                                  }
                                }
                              } catch (error) {
                                console.error('Error updating shift:', error);
                              }
                            };
                            
                            return (
                              <button
                                key={slot.value}
                                onClick={handleSlotClick}
                                className={`
                                  h-12 flex items-center justify-center font-medium rounded-lg border text-sm transition-all cursor-pointer hover:opacity-80
                                  ${hasShift 
                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                                  }
                                `}
                              >
                                {slot.display}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t text-center">
                          <p className="text-sm text-gray-600 mb-3">
                            Time slots from scheduled shifts for {selectedAvailabilityDay.toLocaleDateString('en-US', { weekday: 'long' })} (Click to remove shift)
                          </p>
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-600 rounded"></div>
                              <span className="text-gray-600">Scheduled Hours (Click to Remove)</span>
                            </div>
                          </div>
                            </div>
                          </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Detailed Shifts */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Schedule</h4>
                      <div className="space-y-3">
                        {doctorShifts.map((shift: any) => (
                          <div key={shift.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(shift.date).toLocaleDateString()} - {shift.startTime} to {shift.endTime}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
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
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    shift.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {shift.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {shift.notes && (
                              <p className="text-sm text-gray-600 mt-2">{shift.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}