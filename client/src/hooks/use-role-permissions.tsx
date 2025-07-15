import { useAuth } from "./use-auth";

// Define comprehensive role permissions
export const ROLE_PERMISSIONS = {
  admin: {
    dashboard: true,
    patients: { view: true, create: true, edit: true, delete: true },
    appointments: { view: true, create: true, edit: true, delete: true },
    medical_records: { view: true, create: true, edit: true, delete: true },
    prescriptions: { view: true, create: true, edit: true, delete: true },
    lab_results: { view: true, create: true, edit: true, delete: true },
    medical_imaging: { view: true, create: true, edit: true, delete: true },
    billing: { view: true, create: true, edit: true, delete: true },
    analytics: { view: true, create: true, edit: true, delete: true },
    messaging: { view: true, create: true, edit: true, delete: true },
    ai_insights: { view: true, create: true, edit: true, delete: true },
    voice_documentation: { view: true, create: true, edit: true, delete: true },
    telemedicine: { view: true, create: true, edit: true, delete: true },
    forms: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, create: true, edit: true, delete: true },
    automation: { view: true, create: true, edit: true, delete: true },
    population_health: { view: true, create: true, edit: true, delete: true },
    mobile_health: { view: true, create: true, edit: true, delete: true },
    user_management: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    subscription: { view: true, create: true, edit: true, delete: true }
  },
  doctor: {
    dashboard: true,
    patients: { view: true, create: true, edit: true, delete: false },
    appointments: { view: true, create: true, edit: true, delete: true },
    medical_records: { view: true, create: true, edit: true, delete: false },
    prescriptions: { view: true, create: true, edit: true, delete: true },
    lab_results: { view: true, create: true, edit: true, delete: false },
    medical_imaging: { view: true, create: true, edit: true, delete: false },
    billing: { view: true, create: false, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    messaging: { view: true, create: true, edit: true, delete: true },
    ai_insights: { view: true, create: true, edit: true, delete: false },
    voice_documentation: { view: true, create: true, edit: true, delete: true },
    telemedicine: { view: true, create: true, edit: true, delete: true },
    forms: { view: true, create: true, edit: true, delete: false },
    integrations: { view: true, create: false, edit: false, delete: false },
    automation: { view: true, create: false, edit: false, delete: false },
    population_health: { view: true, create: false, edit: false, delete: false },
    mobile_health: { view: true, create: true, edit: true, delete: false },
    user_management: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false }
  },
  nurse: {
    dashboard: true,
    patients: { view: true, create: true, edit: true, delete: false },
    appointments: { view: true, create: true, edit: true, delete: false },
    medical_records: { view: true, create: true, edit: true, delete: false },
    prescriptions: { view: true, create: true, edit: true, delete: false },
    lab_results: { view: true, create: true, edit: true, delete: false },
    medical_imaging: { view: true, create: false, edit: false, delete: false },
    billing: { view: false, create: false, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    messaging: { view: true, create: true, edit: true, delete: false },
    ai_insights: { view: true, create: false, edit: false, delete: false },
    voice_documentation: { view: true, create: true, edit: true, delete: true },
    telemedicine: { view: true, create: true, edit: true, delete: false },
    forms: { view: true, create: true, edit: true, delete: false },
    integrations: { view: false, create: false, edit: false, delete: false },
    automation: { view: false, create: false, edit: false, delete: false },
    population_health: { view: true, create: false, edit: false, delete: false },
    mobile_health: { view: true, create: true, edit: true, delete: false },
    user_management: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false }
  },
  receptionist: {
    dashboard: true,
    patients: { view: true, create: true, edit: true, delete: false },
    appointments: { view: true, create: true, edit: true, delete: false },
    medical_records: { view: false, create: false, edit: false, delete: false },
    prescriptions: { view: false, create: false, edit: false, delete: false },
    lab_results: { view: false, create: false, edit: false, delete: false },
    medical_imaging: { view: false, create: false, edit: false, delete: false },
    billing: { view: true, create: true, edit: true, delete: false },
    analytics: { view: false, create: false, edit: false, delete: false },
    messaging: { view: true, create: true, edit: true, delete: false },
    ai_insights: { view: false, create: false, edit: false, delete: false },
    voice_documentation: { view: false, create: false, edit: false, delete: false },
    telemedicine: { view: false, create: false, edit: false, delete: false },
    forms: { view: true, create: true, edit: true, delete: false },
    integrations: { view: false, create: false, edit: false, delete: false },
    automation: { view: false, create: false, edit: false, delete: false },
    population_health: { view: false, create: false, edit: false, delete: false },
    mobile_health: { view: false, create: false, edit: false, delete: false },
    user_management: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false }
  },
  patient: {
    dashboard: true,
    patients: { view: false, create: false, edit: false, delete: false }, // Patients can only view their own record
    appointments: { view: true, create: true, edit: false, delete: false }, // Can book but not edit
    medical_records: { view: true, create: false, edit: false, delete: false }, // View only their own
    prescriptions: { view: true, create: false, edit: false, delete: false }, // View only their own
    lab_results: { view: true, create: false, edit: false, delete: false }, // View only their own
    medical_imaging: { view: true, create: false, edit: false, delete: false }, // View only their own
    billing: { view: true, create: false, edit: false, delete: false }, // View only their own
    analytics: { view: false, create: false, edit: false, delete: false },
    messaging: { view: true, create: true, edit: false, delete: false }, // Can send messages to providers
    ai_insights: { view: false, create: false, edit: false, delete: false },
    voice_documentation: { view: false, create: false, edit: false, delete: false },
    telemedicine: { view: true, create: false, edit: false, delete: false }, // Can join consultations
    forms: { view: true, create: false, edit: false, delete: false }, // Can fill forms
    integrations: { view: false, create: false, edit: false, delete: false },
    automation: { view: false, create: false, edit: false, delete: false },
    population_health: { view: false, create: false, edit: false, delete: false },
    mobile_health: { view: true, create: false, edit: false, delete: false }, // Can use mobile health features
    user_management: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false }
  },
  sample_taker: {
    dashboard: true,
    patients: { view: true, create: false, edit: false, delete: false }, // View only for sample collection
    appointments: { view: true, create: false, edit: false, delete: false }, // View lab appointments
    medical_records: { view: false, create: false, edit: false, delete: false },
    prescriptions: { view: false, create: false, edit: false, delete: false },
    lab_results: { view: true, create: true, edit: true, delete: false }, // Main responsibility
    medical_imaging: { view: false, create: false, edit: false, delete: false },
    billing: { view: false, create: false, edit: false, delete: false },
    analytics: { view: false, create: false, edit: false, delete: false },
    messaging: { view: true, create: true, edit: false, delete: false }, // Communicate about samples
    ai_insights: { view: false, create: false, edit: false, delete: false },
    voice_documentation: { view: true, create: true, edit: true, delete: false }, // Document sample collection
    telemedicine: { view: false, create: false, edit: false, delete: false },
    forms: { view: true, create: false, edit: false, delete: false }, // Sample collection forms
    integrations: { view: false, create: false, edit: false, delete: false },
    automation: { view: false, create: false, edit: false, delete: false },
    population_health: { view: false, create: false, edit: false, delete: false },
    mobile_health: { view: false, create: false, edit: false, delete: false },
    user_management: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false }
  }
} as const;

export type UserRole = keyof typeof ROLE_PERMISSIONS;
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export function useRolePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (module: string, action: PermissionAction): boolean => {
    if (!user?.role) return false;
    
    const userRole = user.role as UserRole;
    const rolePerms = ROLE_PERMISSIONS[userRole];
    
    if (!rolePerms) return false;
    
    const modulePerms = rolePerms[module as keyof typeof rolePerms];
    
    if (typeof modulePerms === 'boolean') {
      return modulePerms;
    }
    
    if (typeof modulePerms === 'object' && modulePerms !== null) {
      return (modulePerms as any)[action] || false;
    }
    
    return false;
  };

  const canAccess = (module: string): boolean => {
    return hasPermission(module, 'view');
  };

  const canCreate = (module: string): boolean => {
    return hasPermission(module, 'create');
  };

  const canEdit = (module: string): boolean => {
    return hasPermission(module, 'edit');
  };

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete');
  };

  const getUserRole = (): UserRole | null => {
    return user?.role as UserRole || null;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isDoctor = (): boolean => {
    return user?.role === 'doctor';
  };

  const isNurse = (): boolean => {
    return user?.role === 'nurse';
  };

  const isReceptionist = (): boolean => {
    return user?.role === 'receptionist';
  };

  const isPatient = (): boolean => {
    return user?.role === 'patient';
  };

  const isSampleTaker = (): boolean => {
    return user?.role === 'sample_taker';
  };

  return {
    hasPermission,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    getUserRole,
    isAdmin,
    isDoctor,
    isNurse,
    isReceptionist,
    isPatient,
    isSampleTaker,
    user
  };
}