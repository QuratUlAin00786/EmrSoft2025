import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, UserPlus, Shield, Stethoscope, Users, Calendar, User, TestTube, Lock, BookOpen, X, Check } from "lucide-react";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { getActiveSubdomain } from "@/lib/subdomain-utils";


const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "doctor", "nurse", "receptionist", "patient", "sample_taker", "lab_technician"]),
  department: z.string().optional(),
  medicalSpecialtyCategory: z.string().optional(),
  subSpecialty: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  password: z.string().min(1, "Password is required"),
  // Patient-specific fields
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  nhsNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    memberNumber: z.string().optional(),
    planType: z.string().optional(),
    effectiveDate: z.string().optional(),
  }).optional(),
});

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().min(1, "Description is required"),
  permissions: z.object({
    modules: z.record(z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    })).optional().default({}),
    fields: z.record(z.object({
      view: z.boolean(),
      edit: z.boolean(),
    })).optional().default({}),
  }),
});

type UserFormData = z.infer<typeof userSchema>;
type RoleFormData = z.infer<typeof roleSchema>;

// Permission templates for complete module and field initialization
const MODULE_KEYS = [
  'patients', 'appointments', 'medicalRecords', 'prescriptions', 'billing', 
  'analytics', 'userManagement', 'settings', 'aiInsights', 'messaging', 
  'telemedicine', 'labResults', 'medicalImaging', 'forms'
] as const;

const FIELD_KEYS = [
  'patientSensitiveInfo', 'financialData', 'medicalHistory', 'prescriptionDetails',
  'labResults', 'imagingResults', 'billingInformation', 'insuranceDetails'
] as const;

const createEmptyModulePermission = () => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
});

const createEmptyFieldPermission = () => ({
  view: false,
  edit: false,
});

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  medicalSpecialtyCategory?: string;
  subSpecialty?: string;
  workingDays?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
  permissions?: {
    modules?: any;
    fields?: any;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: {
    modules: Record<string, {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }>;
    fields: Record<string, {
      view: boolean;
      edit: boolean;
    }>;
  };
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery"
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors", 
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery"
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery"
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)"
    ],
    "Urological Surgeon": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    "Periodontist": ["Gum disease specialist"],
    "Endodontist": ["Root canal specialist"]
  },
  "Digestive System": {
    "Gastroenterologist": ["Stomach", "Intestines"],
    "Hepatologist": ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"]
  },
  "Kidneys & Urinary Tract": {
    "Nephrologist": ["Kidney diseases", "Dialysis"],
    "Urological Surgeon": ["Surgical urological procedures"]
  },
  "Respiratory System": {
    "Pulmonologist": ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"]
  },
  "Cancer": {
    "Oncologist": ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"]
  },
  "Endocrine & Hormones": {
    "Endocrinologist": ["Diabetes", "Thyroid", "Hormones"]
  },
  "Muscles & Joints": {
    "Rheumatologist": ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"]
  },
  "Blood & Immunity": {
    "Hematologist": ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"]
  },
  "Others": {
    "Geriatrician": ["Elderly care"],
    "Pathologist": ["Lab & diagnostic testing"],
    "Radiologist": ["Imaging (X-ray, CT, MRI)"],
    "Anesthesiologist": ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"]
  }
};

export default function UserManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("doctor");
  
  // Doctor specialty states
  const [selectedSpecialtyCategory, setSelectedSpecialtyCategory] = useState<string>("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState<string>("");
  const [selectedSpecificArea, setSelectedSpecificArea] = useState<string>("");
  
  // Role management states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Email validation states
  const [emailValidationStatus, setEmailValidationStatus] = useState<'idle' | 'checking' | 'available' | 'exists'>('idle');
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/users");
      const userData = await response.json();
      setUsers(userData);
      setError(null);
    } catch (err) {
      setError(err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = fetchUsers;
  
  // Email validation function
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidationStatus('idle');
      return;
    }
    
    try {
      setEmailValidationStatus('checking');
      const response = await apiRequest("GET", "/api/users");
      const userData = await response.json();
      
      // Check if email exists in users
      const existingUser = userData.find((user: any) => 
        user.email && user.email.toLowerCase() === email.toLowerCase()
      );
      
      if (existingUser) {
        setEmailValidationStatus('exists');
      } else {
        setEmailValidationStatus('available');
      }
    } catch (error) {
      console.error("Error checking email availability:", error);
      setEmailValidationStatus('idle');
    }
  };

  // Debounced email check function
  const handleEmailChange = (email: string) => {
    // Clear existing timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
    }
    
    // Reset validation status if email is empty
    if (!email) {
      setEmailValidationStatus('idle');
      return;
    }
    
    // Set new timeout for delayed check
    const timeout = setTimeout(() => {
      checkEmailAvailability(email);
    }, 800); // 800ms delay
    
    setEmailCheckTimeout(timeout);
  };

  // Debug logging
  console.log("Users query - loading:", isLoading, "error:", error, "users count:", users?.length);
  console.log("Auth token exists:", !!localStorage.getItem('auth_token'));

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "doctor",
      department: "",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: { start: "09:00", end: "17:00" },
      password: "",
      // Patient defaults
      dateOfBirth: "",
      phone: "",
      nhsNumber: "",
      address: {
        street: "",
        city: "",
        state: "",
        postcode: "",
        country: "United Kingdom",
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
      insuranceInfo: {
        provider: "",
        policyNumber: "",
        memberNumber: "",
        planType: "",
        effectiveDate: "",
      },
    },
  });

  const roleForm = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: {
        modules: {
          patients: { view: false, create: false, edit: false, delete: false },
          appointments: { view: false, create: false, edit: false, delete: false },
          medicalRecords: { view: false, create: false, edit: false, delete: false },
          prescriptions: { view: false, create: false, edit: false, delete: false },
          billing: { view: false, create: false, edit: false, delete: false },
          analytics: { view: false, create: false, edit: false, delete: false },
          userManagement: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, create: false, edit: false, delete: false },
          aiInsights: { view: false, create: false, edit: false, delete: false },
          messaging: { view: false, create: false, edit: false, delete: false },
          telemedicine: { view: false, create: false, edit: false, delete: false },
          labResults: { view: false, create: false, edit: false, delete: false },
          medicalImaging: { view: false, create: false, edit: false, delete: false },
          forms: { view: false, create: false, edit: false, delete: false },
        },
        fields: {
          patientSensitiveInfo: { view: false, edit: false },
          financialData: { view: false, edit: false },
          medicalHistory: { view: false, edit: false },
          prescriptionDetails: { view: false, edit: false },
          labResults: { view: false, edit: false },
          imagingResults: { view: false, edit: false },
          billingInformation: { view: false, edit: false },
          insuranceDetails: { view: false, edit: false },
        },
      },
    },
  });

  // Fetch roles with explicit authentication
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/roles");
      return response.json();
    },
    retry: false,
    staleTime: 30000, // Keep data fresh for 30 seconds to prevent auto-refetch
  });

  // Debug roles data
  console.log("Roles query - loading:", rolesLoading, "error:", rolesError, "roles count:", roles.length);
  if (rolesError) console.log("Roles error details:", rolesError);

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      console.log("Sending role data to server:", JSON.stringify(data, null, 2));
      const response = await apiRequest("POST", "/api/roles", data);
      const result = await response.json();
      console.log("Server response:", result);
      return result;
    },
    onSuccess: (newRole) => {
      console.log("Role created successfully, invalidating cache and refetching...");
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.refetchQueries({ queryKey: ["/api/roles"] });
      setIsRoleModalOpen(false);
      setEditingRole(null);
      roleForm.reset();
      toast({
        title: "Role Created",
        description: "The new role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData & { id: number }) => {
      const response = await apiRequest("PATCH", `/api/roles/${data.id}`, data);
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and wait for refetch to complete
      await queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      await queryClient.refetchQueries({ queryKey: ["/api/roles"] });
      
      setIsRoleModalOpen(false);
      setEditingRole(null);
      roleForm.reset();
      
      // Show success modal instead of toast
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await apiRequest("DELETE", `/api/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role Deleted",
        description: "The role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  // Role submission handlers
  const onRoleSubmit = (data: RoleFormData) => {
    // Final normalization: ensure all permission values are proper booleans
    const normalizedModules: Record<string, any> = {};
    MODULE_KEYS.forEach((moduleKey) => {
      const modulePerms = data.permissions?.modules?.[moduleKey] || {};
      normalizedModules[moduleKey] = {
        view: modulePerms.view === true,
        create: modulePerms.create === true,
        edit: modulePerms.edit === true,
        delete: modulePerms.delete === true,
      };
    });
    
    const normalizedFields: Record<string, any> = {};
    FIELD_KEYS.forEach((fieldKey) => {
      const fieldPerms = data.permissions?.fields?.[fieldKey] || {};
      normalizedFields[fieldKey] = {
        view: fieldPerms.view === true,
        edit: fieldPerms.edit === true,
      };
    });
    
    const normalizedData = {
      ...data,
      permissions: {
        modules: normalizedModules,
        fields: normalizedFields,
      },
    };
    
    if (editingRole) {
      updateRoleMutation.mutate({ ...normalizedData, id: editingRole.id });
    } else {
      createRoleMutation.mutate(normalizedData);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    
    // Initialize all modules with template, then merge existing permissions
    const normalizedModules: Record<string, any> = {};
    MODULE_KEYS.forEach((moduleKey) => {
      const existingPerms = role.permissions?.modules?.[moduleKey];
      normalizedModules[moduleKey] = {
        view: existingPerms?.view ?? false,
        create: existingPerms?.create ?? false,
        edit: existingPerms?.edit ?? false,
        delete: existingPerms?.delete ?? false,
      };
    });
    
    // Initialize all fields with template, then merge existing permissions
    const normalizedFields: Record<string, any> = {};
    FIELD_KEYS.forEach((fieldKey) => {
      const existingPerms = role.permissions?.fields?.[fieldKey];
      normalizedFields[fieldKey] = {
        view: existingPerms?.view ?? false,
        edit: existingPerms?.edit ?? false,
      };
    });
    
    roleForm.reset({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: {
        modules: normalizedModules,
        fields: normalizedFields,
      },
    });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = (roleId: number) => {
    deleteRoleMutation.mutate(roleId);
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // If role is patient, check if email already exists in patients table
      if (userData.role === 'patient') {
        console.log("Checking if patient email already exists:", userData.email);
        try {
          const patientsResponse = await apiRequest("GET", "/api/patients");
          const patients = await patientsResponse.json();
          
          // Check if any patient has the same email
          const existingPatient = patients.find((patient: any) => 
            patient.email && patient.email.toLowerCase() === userData.email.toLowerCase()
          );
          
          if (existingPatient) {
            throw new Error("Email already exists in the patients table");
          }
        } catch (error: any) {
          if (error.message === "Email already exists in the patients table") {
            throw error;
          }
          console.warn("Could not check patients table:", error);
          // Continue with user creation if we can't check patients table
        }
      }

      const payload = {
        ...userData,
        username: userData.email, // Use email as username
      };
      console.log("Creating user with payload:", payload);
      
      const response = await apiRequest("POST", "/api/users", payload);
      const result = await response.json();
      console.log("User creation response:", result);
      
      // Patient record creation is now handled automatically by the backend
      if (userData.role === 'patient') {
        console.log("Patient record will be created automatically by backend");
      }
      
      return result;
    },
    onSuccess: (newUser) => {
      toast({
        title: "User created successfully",
        description: "The new user has been added to the system.",
      });
      // Immediately add user to list for instant display
      setUsers(prevUsers => [...prevUsers, newUser]);
      // Also fetch fresh data
      refetch();
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("User creation error (full):", error);
      console.error("Error message:", error?.message);
      console.error("Error response:", error?.response);
      console.error("Error data:", error?.response?.data);
      
      let errorMessage = "There was a problem creating the user. Please try again.";
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.details) {
        errorMessage = error.response.data.details.join(", ");
      } else if (error?.message) {
        // Parse error message format like "400: {"error":"User with this email already exists"}"
        if (error.message.includes(": {")) {
          try {
            const jsonPart = error.message.split(": ")[1];
            const errorObj = JSON.parse(jsonPart);
            errorMessage = errorObj.error || error.message;
          } catch (parseError) {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error creating user",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, userData);
      return await response.json();
    },
    onSuccess: (updatedUserData) => {
      toast({
        title: "User updated successfully",
        description: "The user information has been updated.",
      });
      
      // Update the form with fresh data from server response
      if (editingUser && updatedUserData) {
        const updatedUser = {
          ...editingUser,
          ...updatedUserData,
          workingDays: updatedUserData.workingDays || [],
          workingHours: updatedUserData.workingHours || { start: "09:00", end: "17:00" }
        };
        setEditingUser(updatedUser);
        
        // Update form with fresh server data
        form.reset({
          email: updatedUserData.email,
          firstName: updatedUserData.firstName,
          lastName: updatedUserData.lastName,
          role: updatedUserData.role as any,
          department: updatedUserData.department || "",
          workingDays: updatedUserData.workingDays || [],
          workingHours: updatedUserData.workingHours || { start: "09:00", end: "17:00" },
          password: "",
        });
      }
      
      refetch();
      setTimeout(() => {
        setEditingUser(null);
        setIsCreateModalOpen(false);
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Error updating user",
        description: "There was a problem updating the user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log("Deleting user:", userId);
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return response.json();
    },
    onSuccess: (data, userId) => {
      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system.",
      });
      // Immediately remove user from list for instant display
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      // Also fetch fresh data
      refetch();
    },
    onError: (error) => {
      console.error("Delete user error:", error);
      toast({
        title: "Error deleting user",
        description: "There was a problem deleting the user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    // Include medical specialty fields for doctor role
    const submitData = {
      ...data,
      medicalSpecialtyCategory: data.role === 'doctor' ? selectedSpecialtyCategory : undefined,
      subSpecialty: data.role === 'doctor' ? selectedSubSpecialty : undefined,
    };
    
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: submitData });
    } else {
      createUserMutation.mutate(submitData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    
    // Set medical specialty fields for doctor role
    if (user.role === 'doctor') {
      setSelectedSpecialtyCategory(user.medicalSpecialtyCategory || "");
      setSelectedSubSpecialty(user.subSpecialty || "");
    } else {
      setSelectedSpecialtyCategory("");
      setSelectedSubSpecialty("");
    }
    
    form.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      department: user.department || "",
      workingDays: user.workingDays || [],
      workingHours: user.workingHours || { start: "09:00", end: "17:00" },
      password: "", // Don't pre-fill password for security
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = (userId: number) => {
    deleteUserMutation.mutate(userId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "doctor":
        return <Stethoscope className="h-4 w-4" />;
      case "nurse":
        return <Users className="h-4 w-4" />;
      case "receptionist":
        return <Calendar className="h-4 w-4" />;
      case "patient":
        return <User className="h-4 w-4" />;
      case "sample_taker":
      case "lab_technician":
        return <TestTube className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "doctor":
        return "bg-blue-100 text-blue-800";
      case "nurse":
        return "bg-green-100 text-green-800";
      case "receptionist":
        return "bg-yellow-100 text-yellow-800";
      case "patient":
        return "bg-purple-100 text-purple-800";
      case "sample_taker":
      case "lab_technician":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "doctor":
        return "Doctor";
      case "nurse":
        return "Nurse";
      case "receptionist":
        return "Receptionist";
      case "patient":
        return "Patient";
      case "sample_taker":
      case "lab_technician":
        return "Lab Technician";
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug: Log filtered users to see exactly what's being rendered
  console.log("Filtered users for rendering:", filteredUsers.map(u => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role
  })));

  const userCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="User Management" subtitle="Manage system users and their permissions" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Doctors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userCounts.doctor || 0}</p>
                </div>
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Nurses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userCounts.nurse || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Staff</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(userCounts.receptionist || 0) + (userCounts.admin || 0)}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                User Management
              </button>
              <button
                onClick={() => setActiveTab("roles")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "roles"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Role Management
              </button>
            </nav>
          </div>
        </div>

        {activeTab === "users" && (
          <>
            {/* Header and Controls */}
            <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setIsCreateModalOpen(true);
                setEmailValidationStatus('idle');
                if (emailCheckTimeout) {
                  clearTimeout(emailCheckTimeout);
                }
              }} 
              variant="default" 
              className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700"
            >
              <UserPlus className="h-4 w-4" />
              Add New User
            </Button>
            <Link href={`/${getActiveSubdomain()}/permissions-reference`}>
              <Button variant="outline" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                View Role Permissions
              </Button>
            </Link>
          </div>
        </div>
          
        <Dialog open={isCreateModalOpen || !!editingUser} onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false);
              setEditingUser(null);
              setSelectedRole("doctor");
              form.reset();
              setEmailValidationStatus('idle');
              if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
              }
            }
          }}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Add New User"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? "Update the user's information and permissions."
                    : "Create a new user account with appropriate role and permissions."
                  }
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      className={form.formState.errors.firstName ? "border-red-500" : ""}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      className={form.formState.errors.lastName ? "border-red-500" : ""}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email", {
                      onChange: (e) => {
                        handleEmailChange(e.target.value);
                      }
                    })}
                    className={form.formState.errors.email ? "border-red-500" : ""}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                  {/* Email availability status */}
                  {emailValidationStatus === 'checking' && (
                    <p className="text-sm text-gray-500">Checking availability...</p>
                  )}
                  {emailValidationStatus === 'available' && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Available
                    </p>
                  )}
                  {emailValidationStatus === 'exists' && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <X className="h-4 w-4" />
                      Email already exists
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={(value) => {
                    form.setValue("role", value as any);
                    setSelectedRole(value);
                    // Reset specialty selections when role changes
                    if (value !== "doctor") {
                      setSelectedSpecialtyCategory("");
                      setSelectedSubSpecialty("");
                      setSelectedSpecificArea("");
                    }
                  }} defaultValue={form.getValues("role")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="sample_taker">Lab Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                  )}
                </div>

                {/* Doctor Specialty Dropdowns - Only show when role is doctor */}
                {selectedRole === "doctor" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialtyCategory">Medical Specialty Category</Label>
                      <Select onValueChange={(value) => {
                        setSelectedSpecialtyCategory(value);
                        setSelectedSubSpecialty("");
                        setSelectedSpecificArea("");
                      }} value={selectedSpecialtyCategory}>
                        <SelectTrigger data-testid="dropdown-specialty-category">
                          <SelectValue placeholder="Select specialty category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(medicalSpecialties).map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSpecialtyCategory && (
                      <div className="space-y-2">
                        <Label htmlFor="subSpecialty">Sub-Specialty</Label>
                        <Select onValueChange={(value) => {
                          setSelectedSubSpecialty(value);
                          setSelectedSpecificArea("");
                        }} value={selectedSubSpecialty}>
                          <SelectTrigger data-testid="dropdown-sub-specialty">
                            <SelectValue placeholder="Select sub-specialty" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties] || {}).map((subSpecialty) => (
                              <SelectItem key={subSpecialty} value={subSpecialty}>
                                {subSpecialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedSubSpecialty && selectedSpecialtyCategory && (
                      <div className="space-y-2">
                        <Label htmlFor="specificArea">Specific Area</Label>
                        <Select onValueChange={setSelectedSpecificArea} value={selectedSpecificArea}>
                          <SelectTrigger data-testid="dropdown-specific-area">
                            <SelectValue placeholder="Select specific area" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedSpecialtyCategory && selectedSubSpecialty && 
                              medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties] &&
                              medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties][selectedSubSpecialty as keyof typeof medicalSpecialties[keyof typeof medicalSpecialties]] ?
                              (medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties][selectedSubSpecialty as keyof typeof medicalSpecialties[keyof typeof medicalSpecialties]] as string[]).map((area: string) => (
                                <SelectItem key={area} value={area}>
                                  {area}
                                </SelectItem>
                              )) : []
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {/* Patient-specific fields */}
                {selectedRole === 'patient' && (
                  <>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Patient Information</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">Additional fields required for patient accounts</p>
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          {...form.register("dateOfBirth")}
                          data-testid="input-date-of-birth"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          {...form.register("phone")}
                          placeholder="+44 123 456 7890"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nhsNumber">NHS Number (Optional)</Label>
                      <Input
                        id="nhsNumber"
                        {...form.register("nhsNumber")}
                        placeholder="000 000 0000"
                        data-testid="input-nhs-number"
                      />
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">Address Information</h5>
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          {...form.register("address.street")}
                          placeholder="Enter street address"
                          data-testid="input-street-address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City/Town</Label>
                          <Input
                            id="city"
                            {...form.register("address.city")}
                            placeholder="Enter city"
                            data-testid="input-city"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postcode">Postcode</Label>
                          <Input
                            id="postcode"
                            {...form.register("address.postcode")}
                            placeholder="SW1A 1AA"
                            data-testid="input-postcode"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select onValueChange={(value) => form.setValue("address.country", value)} defaultValue="United Kingdom">
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Ireland">Ireland</SelectItem>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">Emergency Contact</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyName">Name</Label>
                          <Input
                            id="emergencyName"
                            {...form.register("emergencyContact.name")}
                            placeholder="Enter name"
                            data-testid="input-emergency-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergencyRelationship">Relationship</Label>
                          <Input
                            id="emergencyRelationship"
                            {...form.register("emergencyContact.relationship")}
                            placeholder="e.g., Spouse, Parent, Friend"
                            data-testid="input-emergency-relationship"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyPhone">Phone</Label>
                          <Input
                            id="emergencyPhone"
                            {...form.register("emergencyContact.phone")}
                            placeholder="+44 123 456 7890"
                            data-testid="input-emergency-phone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergencyEmail">Email (Optional)</Label>
                          <Input
                            id="emergencyEmail"
                            type="email"
                            {...form.register("emergencyContact.email")}
                            placeholder="emergency@example.com"
                            data-testid="input-emergency-email"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Health Insurance Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">Health Insurance Information (Optional)</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                          <Input
                            id="insuranceProvider"
                            {...form.register("insuranceInfo.provider")}
                            placeholder="Select insurance provider"
                            data-testid="input-insurance-provider"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planType">Plan Type</Label>
                          <Input
                            id="planType"
                            {...form.register("insuranceInfo.planType")}
                            placeholder="Select plan type"
                            data-testid="input-plan-type"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="policyNumber">Policy Number</Label>
                          <Input
                            id="policyNumber"
                            {...form.register("insuranceInfo.policyNumber")}
                            placeholder="Enter policy number"
                            data-testid="input-policy-number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="memberNumber">Member Number</Label>
                          <Input
                            id="memberNumber"
                            {...form.register("insuranceInfo.memberNumber")}
                            placeholder="Enter member number"
                            data-testid="input-member-number"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="effectiveDate">Effective Date</Label>
                        <Input
                          id="effectiveDate"
                          type="date"
                          {...form.register("insuranceInfo.effectiveDate")}
                          data-testid="input-effective-date"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Input
                    id="department"
                    {...form.register("department")}
                    placeholder="e.g., Cardiology, Emergency, etc."
                  />
                </div>

                {/* Working Days */}
                <div className="space-y-2">
                  <Label>Working Days</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={day}
                          key={`${day}-${editingUser?.id || 'new'}`}
                          defaultChecked={form.getValues("workingDays")?.includes(day)}
                          onChange={(e) => {
                            const currentDays = form.getValues("workingDays") || [];
                            if (e.target.checked) {
                              form.setValue("workingDays", [...currentDays, day]);
                            } else {
                              form.setValue("workingDays", currentDays.filter(d => d !== day));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={day} className="text-sm font-normal">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Working Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      key={`start-${editingUser?.id || 'new'}`}
                      defaultValue={form.getValues("workingHours")?.start || "09:00"}
                      onChange={(e) => {
                        const current = form.getValues("workingHours") || { start: "09:00", end: "17:00" };
                        form.setValue("workingHours", { ...current, start: e.target.value });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      key={`end-${editingUser?.id || 'new'}`}
                      defaultValue={form.getValues("workingHours")?.end || "17:00"}
                      onChange={(e) => {
                        const current = form.getValues("workingHours") || { start: "09:00", end: "17:00" };
                        form.setValue("workingHours", { ...current, end: e.target.value });
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? "New Password (Optional)" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    className={form.formState.errors.password ? "border-red-500" : ""}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Role Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {getRoleDisplayName(selectedRole)} Access Level:
                  </h4>
                  <p className="text-sm text-blue-700">
                    {selectedRole === 'admin' && "Full system access including user management, settings, and all clinical modules."}
                    {selectedRole === 'doctor' && "Clinical access to patient records, appointments, prescriptions, and medical documentation."}
                    {selectedRole === 'nurse' && "Patient care access including medical records, medications, and care coordination."}
                    {selectedRole === 'receptionist' && "Limited access to patient information, appointments, and billing functions."}
                    {selectedRole === 'patient' && "Personal health record access including appointments, prescriptions, and medical history."}
                    {selectedRole === 'sample_taker' && "Lab-focused access for sample collection, lab results, and basic patient information."}
                    {selectedRole === 'lab_technician' && "Lab-focused access for sample collection, lab results, and basic patient information."}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ Permissions will be automatically assigned based on the selected role
                  </p>
                </div>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingUser(null);
                      setSelectedRole("doctor");
                      form.reset();
                      setEmailValidationStatus('idle');
                      if (emailCheckTimeout) {
                        clearTimeout(emailCheckTimeout);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending ? 
                      "Saving..." : 
                      (editingUser ? "Update User" : "Create User")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm ? "No users found matching your search." : "No users found."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user, index) => (
                  <div
                    key={`user-${user.id}-${user.email}`}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {user.firstName || 'N/A'} {user.lastName || 'N/A'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        {user.department && user.department.trim() && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{user.department}</p>
                        )}
                        {user.workingDays && user.workingDays.length > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Working: {user.workingDays.join(", ")} ({user.workingHours?.start || '09:00'} - {user.workingHours?.end || '17:00'})
                          </p>
                        )}
                        
                        {/* Medical Specialty Tags for Doctors */}
                        {user.role === 'doctor' && (user.subSpecialty || user.medicalSpecialtyCategory) && (
                          <div className="flex gap-1 mt-2">
                            {user.subSpecialty && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                                {user.subSpecialty}
                              </span>
                            )}
                            {user.medicalSpecialtyCategory && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                                {user.medicalSpecialtyCategory}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.firstName} {user.lastName}? 
                                This action cannot be undone and will remove all their access to the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === "roles" && (
          <>
            {/* Role Management Header and Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Role Management</h2>
                <p className="text-sm text-gray-600">Create and manage custom roles with specific permissions</p>
              </div>
              
              <Dialog open={isRoleModalOpen || !!editingRole} onOpenChange={(open) => {
                if (!open) {
                  setIsRoleModalOpen(false);
                  setEditingRole(null);
                  roleForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsRoleModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRole ? "Edit Role" : "Create New Role"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRole 
                        ? "Update the role's information and permissions."
                        : "Create a new role with specific permissions and access levels."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roleName">Role Name</Label>
                        <Input
                          id="roleName"
                          {...roleForm.register("name")}
                          placeholder="e.g., senior_doctor"
                          className={roleForm.formState.errors.name ? "border-red-500" : ""}
                        />
                        {roleForm.formState.errors.name && (
                          <p className="text-sm text-red-500">{roleForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="roleDisplayName">Display Name</Label>
                        <Input
                          id="roleDisplayName"
                          {...roleForm.register("displayName")}
                          placeholder="e.g., Senior Doctor"
                          className={roleForm.formState.errors.displayName ? "border-red-500" : ""}
                        />
                        {roleForm.formState.errors.displayName && (
                          <p className="text-sm text-red-500">{roleForm.formState.errors.displayName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="roleDescription">Description</Label>
                      <Input
                        id="roleDescription"
                        {...roleForm.register("description")}
                        placeholder="Describe the role's responsibilities and access level"
                        className={roleForm.formState.errors.description ? "border-red-500" : ""}
                      />
                      {roleForm.formState.errors.description && (
                        <p className="text-sm text-red-500">{roleForm.formState.errors.description.message}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label>Module Permissions</Label>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          Configure what modules this role can access and what actions they can perform.
                        </p>
                        
                        <div className="space-y-4">
                          {/* Permission Matrix Headers */}
                          <div className="grid grid-cols-5 gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-600">
                            <div>Module</div>
                            <div className="text-center">View</div>
                            <div className="text-center">Create</div>
                            <div className="text-center">Edit</div>
                            <div className="text-center">Delete</div>
                          </div>

                          {/* Module Permissions */}
                          {[
                            { key: 'patients', name: 'Patients', description: 'Manage patient records and information' },
                            { key: 'appointments', name: 'Appointments', description: 'Schedule and manage appointments' },
                            { key: 'medicalRecords', name: 'Medical Records', description: 'Create and view medical records' },
                            { key: 'prescriptions', name: 'Prescriptions', description: 'Prescribe and manage medications' },
                            { key: 'billing', name: 'Billing', description: 'Process payments and invoicing' },
                            { key: 'analytics', name: 'Analytics', description: 'View reports and analytics' },
                            { key: 'userManagement', name: 'User Management', description: 'Manage system users and roles' },
                            { key: 'settings', name: 'Settings', description: 'Configure system settings' },
                            { key: 'aiInsights', name: 'AI Insights', description: 'Access AI-powered insights' },
                            { key: 'messaging', name: 'Messaging', description: 'Send messages and notifications' },
                            { key: 'telemedicine', name: 'Telemedicine', description: 'Video consultations' },
                            { key: 'labResults', name: 'Lab Results', description: 'Manage laboratory results' },
                            { key: 'medicalImaging', name: 'Medical Imaging', description: 'View and manage medical images' },
                            { key: 'forms', name: 'Forms', description: 'Create and manage forms' }
                          ].map((module) => {
                            const currentPerms = roleForm.watch(`permissions.modules.${module.key}`) || {};
                            
                            return (
                              <div key={module.key} className="grid grid-cols-5 gap-2 items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">{module.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{module.description}</div>
                                </div>
                                
                                {(['view', 'create', 'edit', 'delete'] as const).map((action) => (
                                  <div key={action} className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={currentPerms[action] === true}
                                      onChange={(e) => {
                                        // Get current form state to ensure we have clean data
                                        const allPerms = roleForm.getValues('permissions.modules') || {};
                                        const currentModule = allPerms[module.key] || createEmptyModulePermission();
                                        
                                        // Create updated module permission object with all required boolean fields
                                        const updatedModule = {
                                          view: typeof currentModule.view === 'boolean' ? currentModule.view : false,
                                          create: typeof currentModule.create === 'boolean' ? currentModule.create : false,
                                          edit: typeof currentModule.edit === 'boolean' ? currentModule.edit : false,
                                          delete: typeof currentModule.delete === 'boolean' ? currentModule.delete : false,
                                          [action]: e.target.checked
                                        };
                                        
                                        roleForm.setValue(`permissions.modules.${module.key}`, updatedModule, { 
                                          shouldValidate: false,
                                          shouldDirty: true,
                                        });
                                      }}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>

                        {/* Field Permissions */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Sensitive Field Access</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { key: 'patientSensitiveInfo', name: 'Patient Sensitive Information' },
                              { key: 'financialData', name: 'Financial Data' },
                              { key: 'medicalHistory', name: 'Medical History' },
                              { key: 'prescriptionDetails', name: 'Prescription Details' },
                              { key: 'labResults', name: 'Lab Results' },
                              { key: 'imagingResults', name: 'Imaging Results' },
                              { key: 'billingInformation', name: 'Billing Information' },
                              { key: 'insuranceDetails', name: 'Insurance Details' }
                            ].map((field) => {
                              const currentFieldPerms = roleForm.watch(`permissions.fields.${field.key}`) || {};
                              
                              return (
                                <div key={field.key} className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{field.name}</div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={currentFieldPerms.view === true}
                                        onChange={(e) => {
                                          // Get current form state to ensure we have clean data
                                          const allFields = roleForm.getValues('permissions.fields') || {};
                                          const currentField = allFields[field.key] || createEmptyFieldPermission();
                                          
                                          // Create updated field permission object with all required boolean fields
                                          const updatedField = {
                                            view: e.target.checked,
                                            edit: typeof currentField.edit === 'boolean' ? currentField.edit : false
                                          };
                                          
                                          roleForm.setValue(`permissions.fields.${field.key}`, updatedField, {
                                            shouldValidate: false,
                                            shouldDirty: true,
                                          });
                                        }}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">View</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={currentFieldPerms.edit === true}
                                        onChange={(e) => {
                                          // Get current form state to ensure we have clean data
                                          const allFields = roleForm.getValues('permissions.fields') || {};
                                          const currentField = allFields[field.key] || createEmptyFieldPermission();
                                          
                                          // Create updated field permission object with all required boolean fields
                                          const updatedField = {
                                            view: typeof currentField.view === 'boolean' ? currentField.view : false,
                                            edit: e.target.checked
                                          };
                                          
                                          roleForm.setValue(`permissions.fields.${field.key}`, updatedField, {
                                            shouldValidate: false,
                                            shouldDirty: true,
                                          });
                                        }}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Edit</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsRoleModalOpen(false);
                          setEditingRole(null);
                          roleForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button"
                        onClick={() => {
                          // Get form values and submit directly (bypass validation since we normalize in onRoleSubmit)
                          const values = roleForm.getValues();
                          
                          // Basic field validation only
                          if (!values.name || !values.displayName || !values.description) {
                            toast({
                              title: "Validation Error",
                              description: "Please fill in all required fields (Name, Display Name, Description)",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          onRoleSubmit(values);
                        }}
                        disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                      >
                        {createRoleMutation.isPending || updateRoleMutation.isPending ? 
                          "Saving..." : 
                          (editingRole ? "Update Role" : "Create Role")
                        }
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Roles List */}
            <Card>
              <CardHeader>
                <CardTitle>System Roles</CardTitle>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <div className="text-center py-8">Loading roles...</div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No roles found. Create your first custom role to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roles.map((role: Role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white bg-orange-500 px-3 py-1 rounded w-48 text-center">
                              {role.displayName}
                            </h3>
                            <p className="text-sm text-gray-500">{role.description}</p>
                            <p className="text-xs text-gray-400">Role ID: {role.name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Badge variant={role.isSystem ? "secondary" : "default"}>
                            {role.isSystem ? "System Role" : "Custom Role"}
                          </Badge>
                          
                          <div className="flex items-center space-x-2">
                            {/* Edit button available for all roles */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {/* Delete button only for custom roles */}
                            {role.isSystem === false && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the "{role.displayName}" role? 
                                      This action cannot be undone and will affect all users with this role.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteRole(role.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete Role
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Success
            </DialogTitle>
            <DialogDescription>
              The role has been updated successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full sm:w-auto"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}