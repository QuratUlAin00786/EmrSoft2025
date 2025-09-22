import { useRolePermissions } from "@/hooks/use-role-permissions";
import { AdminAppointments } from "./admin-appointments";
import { DoctorAppointments } from "./doctor-appointments";
import { NurseAppointments } from "./nurse-appointments";
import { ReceptionistAppointments } from "./receptionist-appointments";
import { PatientAppointments } from "./patient-appointments";
import { SampleTakerAppointments } from "./sample-taker-appointments";

export function RoleBasedAppointments() {
  const { getUserRole, user } = useRolePermissions();
  const userRole = getUserRole();

  if (!user || !userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  switch (userRole) {
    case 'admin':
      return <AdminAppointments />;
    case 'doctor':
      return <DoctorAppointments />;
    case 'nurse':
      return <NurseAppointments />;
    case 'receptionist':
      return <ReceptionistAppointments />;
    case 'patient':
      return <PatientAppointments />;
    case 'sample_taker':
      return <SampleTakerAppointments />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-neutral-600">Role not recognized: {userRole}</p>
            <p className="text-sm text-neutral-500 mt-2">Please contact your administrator.</p>
          </div>
        </div>
      );
  }
}