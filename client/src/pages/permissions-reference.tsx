import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Shield, Check, X, Eye, Plus, Edit, Trash2, Save, RotateCcw, AlertCircle } from "lucide-react";
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
          ...editingRole.permissions.modules,
          [module]: {
            ...editingRole.permissions.modules[module],
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
          ...editingRole.permissions.fields,
          [field]: {
            ...editingRole.permissions.fields[field],
            [permission]: value
          }
        }
      }
    });
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

      <div className="grid gap-6">
        {roles?.map((role: Role) => {
          const isEditing = editingRoleId === role.id;
          const currentRole = isEditing ? editingRole : role;
          const roleColor = ROLE_COLORS[role.name as keyof typeof ROLE_COLORS] || "bg-gray-500";
          
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
                          <CardTitle className="text-xl">{role.displayName}</CardTitle>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(role)}
                          data-testid="button-edit-role"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Permission Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-sm">View - Can see the data</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Create - Can add new items</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Edit - Can modify existing items</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Delete - Can remove items</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}