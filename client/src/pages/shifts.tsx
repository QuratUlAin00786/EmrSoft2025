import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Edit2, Trash2, Users, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShiftsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for creating/editing shifts
  const [formData, setFormData] = useState({
    staffId: "",
    date: selectedDate,
    shiftType: "regular",
    startTime: "09:00",
    endTime: "17:00",
    status: "scheduled",
    notes: "",
    isAvailable: true
  });

  // Fetch medical staff with explicit query function
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery({
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

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift created successfully",
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
        description: error.message || "Failed to create shift",
        variant: "destructive",
      });
    },
  });

  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, ...shiftData }: any) => {
      const response = await apiRequest("PUT", `/api/shifts/${id}`, shiftData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingShift(null);
      refetchShifts();
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shift",
        variant: "destructive",
      });
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      await apiRequest("DELETE", `/api/shifts/${shiftId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift deleted successfully",
      });
      refetchShifts();
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shift",
        variant: "destructive",
      });
    },
  });

  const handleCreateShift = () => {
    if (!formData.staffId || !formData.date || !formData.startTime || !formData.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Convert staffId from string to number for backend validation
    const shiftData = {
      ...formData,
      staffId: parseInt(formData.staffId)
    };

    createShiftMutation.mutate(shiftData);
  };

  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setFormData({
      staffId: shift.staffId.toString(),
      date: shift.date.split('T')[0],
      shiftType: shift.shiftType,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      notes: shift.notes || "",
      isAvailable: shift.isAvailable
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateShift = () => {
    if (!formData.staffId || !formData.date || !formData.startTime || !formData.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Convert staffId from string to number for backend validation
    const shiftData = {
      ...formData,
      staffId: parseInt(formData.staffId)
    };

    updateShiftMutation.mutate({
      id: editingShift.id,
      ...shiftData
    });
  };

  const handleDeleteShift = (shiftId: number) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(shiftId);
    }
  };

  const resetForm = () => {
    setFormData({
      staffId: "",
      date: selectedDate,
      shiftType: "regular",
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
      notes: "",
      isAvailable: true
    });
  };

  const getStaffName = (staffId: number) => {
    const staffMember = staff.find((s: any) => s.id === staffId);
    if (!staffMember) return 'Unknown';
    
    const prefix = staffMember.role === 'doctor' ? 'Dr.' : 
                   staffMember.role === 'nurse' ? 'Nurse' : 
                   staffMember.role === 'lab_technician' ? 'Lab Tech' : '';
    
    return `${prefix} ${staffMember.firstName} ${staffMember.lastName}`;
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'overtime': return 'bg-orange-100 text-orange-800';
      case 'on_call': return 'bg-purple-100 text-purple-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'absent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Staff Member *</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                >
                  <option value="">Select staff member...</option>
                  {staff.map((member: any) => {
                    const prefix = member.role === 'doctor' ? 'Dr.' : 
                                   member.role === 'nurse' ? 'Nurse' : 
                                   member.role === 'lab_technician' ? 'Lab Tech' : '';
                    const department = member.department || member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                      <option key={member.id} value={member.id}>
                        {prefix} {member.firstName} {member.lastName} - {department}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date *</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Shift Type</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.shiftType}
                    onChange={(e) => setFormData(prev => ({ ...prev, shiftType: e.target.value }))}
                  >
                    <option value="regular">Regular</option>
                    <option value="overtime">Overtime</option>
                    <option value="on_call">On Call</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start Time *</label>
                  <input
                    type="time"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End Time *</label>
                  <input
                    type="time"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700">
                  Available for appointments
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md h-20"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateShift}
                  disabled={createShiftMutation.isPending}
                >
                  {createShiftMutation.isPending ? "Creating..." : "Create Shift"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">View shifts for:</label>
          <input
            type="date"
            className="p-2 border border-gray-300 rounded-md"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarCheck className="h-4 w-4" />
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
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

      {/* Shifts List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Shifts for {new Date(selectedDate).toLocaleDateString()}
          </h2>
        </div>
        
        {shiftsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 mt-2">Loading shifts...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No shifts scheduled for this date</p>
            <p className="text-sm text-gray-500 mt-1">Click "Schedule Shift" to add a new shift</p>
          </div>
        ) : (
          <div className="divide-y">
            {shifts.map((shift: any) => (
              <div key={shift.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {getStaffName(shift.staffId)}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShiftTypeColor(shift.shiftType)}`}>
                        {shift.shiftType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shift.status)}`}>
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
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditShift(shift)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteShift(shift.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Staff Member *</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.staffId}
                onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
              >
                <option value="">Select staff member...</option>
                {staff.map((member: any) => {
                  const prefix = member.role === 'doctor' ? 'Dr.' : 
                                 member.role === 'nurse' ? 'Nurse' : 
                                 member.role === 'lab_technician' ? 'Lab Tech' : '';
                  const department = member.department || member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <option key={member.id} value={member.id}>
                      {prefix} {member.firstName} {member.lastName} - {department}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date *</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Shift Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.shiftType}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftType: e.target.value }))}
                >
                  <option value="regular">Regular</option>
                  <option value="overtime">Overtime</option>
                  <option value="on_call">On Call</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Start Time *</label>
                <input
                  type="time"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">End Time *</label>
                <input
                  type="time"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsAvailable"
                checked={formData.isAvailable}
                onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="editIsAvailable" className="text-sm font-medium text-gray-700">
                Available for appointments
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md h-20"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpdateShift}
                disabled={updateShiftMutation.isPending}
              >
                {updateShiftMutation.isPending ? "Updating..." : "Update Shift"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}