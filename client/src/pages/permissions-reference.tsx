import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Header } from "@/components/layout/header";
import { Shield, Check, X, Eye, Plus, Edit, Trash2, Save, RotateCcw, AlertCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { apiRequest } from "@/lib/queryClient";
import type { Role, InsertRole } from "@shared/schema";

// Define color mapping for roles
const ROLE_COLORS = {
  admin: "bg-red-500",
  doctor: "bg-blue-500", 
  nurse: "bg-green-500",
  receptionist: "bg-purple-500",
  patient: "bg-orange-500",
  sample_taker: "bg-teal-500"
};

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: Edit,
  delete: Trash2
};

const ALL_MODULES = [
  "patients", "appointments", "medicalRecords", "prescriptions", "labResults", 
  "medicalImaging", "billing", "analytics", "userManagement", "settings",
  "aiInsights", "messaging", "telemedicine", "populationHealth", "clinicalDecision", 
  "voiceDocumentation", "forms", "integrations", "automation", "mobileHealth"
];

const ALL_FIELDS = [
  "patientSensitiveInfo", "financialData", "medicalHistory", "prescriptionDetails",
  "labResults", "imagingResults", "billingInformation", "insuranceDetails"
];

export default function PermissionsReference() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  
  // State for editing
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // State for creating new role
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRole, setNewRole] = useState<Partial<InsertRole>>({ name: "", displayName: "", description: "" });
  
  // State for deleting role
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  
  // Fetch roles
  const { data: roles, isLoading, error } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/roles", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }

      return response.json();
    },
  });
  
  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: InsertRole) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/roles", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create role: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role Created",
        description: "New role has been created successfully.",
      });
      setShowCreateDialog(false);
      setNewRole({ name: "", displayName: "", description: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, updates }: { roleId: number; updates: Partial<Role> }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update role: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role Updated",
        description: "Role permissions have been updated successfully.",
      });
      setEditingRoleId(null);
      setEditingRole(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update role permissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": tenant?.subdomain || "demo",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete role: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role Deleted",
        description: "Role has been deleted successfully.",
      });
      setShowDeleteDialog(false);
      setRoleToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Helper functions
  const startEditing = (role: Role) => {
    setEditingRoleId(role.id);
    setEditingRole({ ...role });
  };
  
  const cancelEditing = () => {
    setEditingRoleId(null);
    setEditingRole(null);
  };
  
  const saveRole = () => {
    if (editingRole && editingRoleId) {
      updateRoleMutation.mutate({
        roleId: editingRoleId,
        updates: {
          displayName: editingRole.displayName,
          description: editingRole.description,
          permissions: editingRole.permissions
        }
      });
    }
  };
  
  const updateModulePermission = (module: string, action: string, value: boolean) => {
    if (!editingRole) return;
    
    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        modules: {
          ...editingRole.permissions?.modules || {},
          [module]: {
            ...(editingRole.permissions?.modules?.[module] || {}),
            [action]: value
          }
        }
      }
    });
  };
  
  const updateFieldPermission = (field: string, permission: string, value: boolean) => {
    if (!editingRole) return;
    
    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        fields: {
          ...editingRole.permissions?.fields || {},
          [field]: {
            ...(editingRole.permissions?.fields?.[field] || {}),
            [permission]: value
          }
        }
      }
    });
  };

  // Helper function to normalize role name for color mapping
  const getRoleColor = (roleName: string) => {
    const normalizedName = roleName.trim().toLowerCase().replace(/\s+/g, '_');
    return ROLE_COLORS[normalizedName as keyof typeof ROLE_COLORS] || "bg-gray-500";
  };

  // Helper function to get display name for role
  const getDisplayName = (role: Role) => {
    if (role.displayName) return role.displayName;
    const trimmedName = role.name.trim();
    // Normalize doctor to Physician
    if (trimmedName.toLowerCase() === 'doctor') return 'Physician';
    return trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
  };

  // Helper functions for create/delete
  const handleCreateRole = () => {
    if (!newRole.name || !newRole.displayName) {
      toast({
        title: "Error",
        description: "Role name and display name are required.",
        variant: "destructive",
      });
      return;
    }
    
    const roleData: InsertRole = {
      name: newRole.name,
      organizationId: tenant?.id || 0,
      displayName: newRole.displayName,
      description: newRole.description || "",
      permissions: {
        modules: {},
        fields: {}
      }
    };
    
    createRoleMutation.mutate(roleData);
  };

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
    }
  };

  const renderPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-400" />
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header 
          title="Role Permissions Reference" 
          subtitle="Complete overview of access levels and permissions for each user role"
        />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header 
          title="Role Permissions Reference" 
          subtitle="Complete overview of access levels and permissions for each user role"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">Failed to load roles</p>
              <p className="text-gray-600">There was an error loading role permissions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header 
        title="Role Permissions Reference" 
        subtitle="Complete overview of access levels and permissions for each user role"
      />

      {/* Create Role Button */}
      {user?.role === "admin" && (
        <div className="flex justify-end">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-role">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role with custom permissions for your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newRole.name || ""}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g., nurse"
                    data-testid="input-new-role-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="displayName" className="text-right">
                    Display Name
                  </label>
                  <Input
                    id="displayName"
                    value={newRole.displayName || ""}
                    onChange={(e) => setNewRole(prev => ({ ...prev, displayName: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g., Nurse"
                    data-testid="input-new-role-display-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={newRole.description || ""}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                    placeholder="Role description..."
                    rows={3}
                    data-testid="textarea-new-role-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending}
                  data-testid="button-confirm-create-role"
                >
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.displayName || roleToDelete?.name}"? 
              This action cannot be undone and will affect all users currently assigned to this role.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              data-testid="button-cancel-delete-role"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteRoleMutation.isPending}
              data-testid="button-confirm-delete-role"
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">
        {roles?.map((role: Role) => {
          const isEditing = editingRoleId === role.id;
          const currentRole = isEditing ? editingRole : role;
          const roleColor = getRoleColor(role.name);
          
          return (
            <Card key={role.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${roleColor}`} />
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={currentRole?.displayName || ""}
                            onChange={(e) => setEditingRole(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                            className="text-xl font-semibold"
                            data-testid="input-role-display-name"
                          />
                          <Textarea
                            value={currentRole?.description || ""}
                            onChange={(e) => setEditingRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                            className="text-sm"
                            rows={2}
                            data-testid="textarea-role-description"
                          />
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-xl">{getDisplayName(role)}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Edit Controls */}
                  {user?.role === "admin" && !role.isSystem && (
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={saveRole}
                            disabled={updateRoleMutation.isPending}
                            data-testid="button-save-role"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={updateRoleMutation.isPending}
                            data-testid="button-cancel-role"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(role)}
                            data-testid="button-edit-role"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRoleToDelete(role);
                              setShowDeleteDialog(true);
                            }}
                            data-testid="button-delete-role"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Module Permissions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Module Access</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ALL_MODULES.map((module) => {
                      const permissions = currentRole?.permissions.modules[module] || { view: false, create: false, edit: false, delete: false };
                      
                      return (
                        <div key={module} className="border rounded-lg p-3" data-testid={`module-${module}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm capitalize">
                              {module.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            {Object.entries(permissions).map(([action, allowed]) => {
                              const Icon = ACTION_ICONS[action as keyof typeof ACTION_ICONS];
                              return (
                                <div key={action} className="flex items-center gap-1">
                                  <Icon className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600 capitalize">{action}</span>
                                  {isEditing ? (
                                    <Switch
                                      checked={allowed}
                                      onCheckedChange={(value) => updateModulePermission(module, action, value)}
                                      data-testid={`switch-module-${module}-${action}`}
                                    />
                                  ) : (
                                    renderPermissionIcon(allowed)
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field Access Permissions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Data Field Access</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {ALL_FIELDS.map((field) => {
                      const fieldPermissions = currentRole?.permissions.fields[field] || { view: false, edit: false };
                      
                      return (
                        <div key={field} className="border rounded p-2 space-y-2" data-testid={`field-${field}`}>
                          <span className="text-sm font-medium capitalize block">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">View</span>
                            {isEditing ? (
                              <Switch
                                checked={fieldPermissions.view}
                                onCheckedChange={(value) => updateFieldPermission(field, "view", value)}
                                data-testid={`switch-field-${field}-view`}
                              />
                            ) : (
                              renderPermissionIcon(fieldPermissions.view)
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Edit</span>
                            {isEditing ? (
                              <Switch
                                checked={fieldPermissions.edit}
                                onCheckedChange={(value) => updateFieldPermission(field, "edit", value)}
                                data-testid={`switch-field-${field}-edit`}
                              />
                            ) : (
                              renderPermissionIcon(fieldPermissions.edit)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Permission Legend */}
      <Card data-testid="permission-legend">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Legend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Icons */}
          <div>
            <h4 className="font-semibold mb-3">Action Permissions</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2" data-testid="legend-view">
                <Eye className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">View</span>
                  <p className="text-xs text-gray-600">Can see and read data</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-create">
                <Plus className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Create</span>
                  <p className="text-xs text-gray-600">Can add new items</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-edit">
                <Edit className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Edit</span>
                  <p className="text-xs text-gray-600">Can modify existing items</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-delete">
                <Trash2 className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Delete</span>
                  <p className="text-xs text-gray-600">Can remove items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Status */}
          <div>
            <h4 className="font-semibold mb-3">Permission Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2" data-testid="legend-allowed">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <span className="text-sm font-medium text-green-700">Allowed</span>
                  <p className="text-xs text-gray-600">Permission is granted</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-denied">
                <X className="h-4 w-4 text-red-400" />
                <div>
                  <span className="text-sm font-medium text-red-600">Denied</span>
                  <p className="text-xs text-gray-600">Permission is not granted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Colors */}
          <div>
            <h4 className="font-semibold mb-3">Role Types</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-2" data-testid="legend-admin">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Administrator</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-doctor">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">Physician</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-nurse">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Nurse</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-receptionist">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm">Receptionist</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-patient">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Patient</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-sample-taker">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-sm">Sample Taker</span>
              </div>
            </div>
          </div>

          {/* Module Types */}
          <div>
            <h4 className="font-semibold mb-3">Module Categories</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Core Modules:</strong> Patients, Appointments, Medical Records, Prescriptions</p>
              <p><strong>Clinical:</strong> Lab Results, Medical Imaging, AI Insights, Clinical Decision Support</p>
              <p><strong>Administrative:</strong> Billing, User Management, Settings, Analytics</p>
              <p><strong>Communication:</strong> Messaging, Telemedicine, Voice Documentation</p>
              <p><strong>Advanced:</strong> Forms, Integrations, Automation, Mobile Health, Population Health</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}