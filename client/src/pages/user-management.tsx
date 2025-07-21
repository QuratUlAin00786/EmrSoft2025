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
import { Plus, Edit, Trash2, UserPlus, Shield, Stethoscope, Users, Calendar, User, TestTube, Lock, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";


const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "doctor", "nurse", "receptionist", "patient", "sample_taker"]),
  department: z.string().optional(),
  password: z.string().min(1, "Password is required"),
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
    })),
    fields: z.record(z.object({
      view: z.boolean(),
      edit: z.boolean(),
    })),
  }),
});

type UserFormData = z.infer<typeof userSchema>;
type RoleFormData = z.infer<typeof roleSchema>;

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
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

export default function UserManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("doctor");
  
  // Role management states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

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
      password: "",
    },
  });

  const roleForm = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: {
        modules: {},
        fields: {},
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
  });

  // Debug roles data
  console.log("Roles query - loading:", rolesLoading, "error:", rolesError, "roles count:", roles.length);
  if (rolesError) console.log("Roles error details:", rolesError);

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const response = await apiRequest("POST", "/api/roles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsRoleModalOpen(false);
      setEditingRole(null);
      roleForm.reset();
      toast({
        title: "Role Updated",
        description: "The role has been updated successfully.",
      });
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
    if (editingRole) {
      updateRoleMutation.mutate({ ...data, id: editingRole.id });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    roleForm.reset({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
    });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = (roleId: number) => {
    deleteRoleMutation.mutate(roleId);
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const payload = {
        ...userData,
        username: userData.email, // Use email as username
      };
      console.log("Creating user with payload:", payload);
      
      const response = await apiRequest("POST", "/api/users", payload);
      const result = await response.json();
      console.log("User creation response:", result);
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
    mutationFn: ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => {
      return apiRequest("PATCH", `/api/users/${id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: "The user information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      form.reset();
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
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    form.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      department: user.department || "",
      password: "", // Don't pre-fill password for security
    });
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
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Doctors</p>
                  <p className="text-2xl font-bold">{userCounts.doctor || 0}</p>
                </div>
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nurses</p>
                  <p className="text-2xl font-bold">{userCounts.nurse || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Staff</p>
                  <p className="text-2xl font-bold">{(userCounts.receptionist || 0) + (userCounts.admin || 0)}</p>
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
            <Link href="/permissions-reference">
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
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
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
                    {...form.register("email")}
                    className={form.formState.errors.email ? "border-red-500" : ""}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={(value) => {
                    form.setValue("role", value as any);
                    setSelectedRole(value);
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
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Input
                    id="department"
                    {...form.register("department")}
                    placeholder="e.g., Cardiology, Emergency, etc."
                  />
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
              <div className="text-center py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No users found matching your search." : "No users found."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.department && (
                          <p className="text-xs text-gray-400">{user.department}</p>
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
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-4">
                          Configure what modules this role can access and what actions they can perform.
                        </p>
                        <div className="text-center text-gray-500 py-8">
                          <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p>Permission matrix will be implemented here</p>
                          <p className="text-sm">Select view, create, edit, and delete permissions for each module</p>
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
                        type="submit" 
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
                            <h3 className="font-medium text-gray-900">
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
                          
                          {!role.isSystem && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                                className="text-blue-600 hover:text-blue-700"
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
                            </div>
                          )}
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
    </div>
  );
}