import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Search, Shield, Heart, User as UserIcon } from "lucide-react";
import type { User } from "@/types";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "doctor", "nurse", "receptionist"]),
  department: z.string().optional()
});

type CreateUserData = z.infer<typeof createUserSchema>;

const roleColors = {
  admin: "bg-purple-100 text-purple-800",
  doctor: "bg-blue-100 text-blue-800",
  nurse: "bg-green-100 text-green-800",
  receptionist: "bg-orange-100 text-orange-800"
};

const roleIcons = {
  admin: Shield,
  doctor: UserIcon,
  nurse: Heart,
  receptionist: UserIcon
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatLastLogin(lastLoginAt?: string): string {
  if (!lastLoginAt) return "Never";
  
  const date = new Date(lastLoginAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      return apiRequest(method, endpoint, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateModal(false);
      setEditingUser(null);
      form.reset();
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department || "",
      password: ""
    });
    setShowCreateModal(true);
  };



  const handleCreateUser = () => {
    setEditingUser(null);
    form.reset();
    setShowCreateModal(true);
  };

  const form = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "doctor",
      department: ""
    }
  });

  const onSubmit = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = searchQuery === "" || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  }) || [];

  if (isLoading) {
    return (
      <>
        <Header 
          title="User Management" 
          subtitle="Manage team members and their permissions."
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          title="User Management" 
          subtitle="Manage team members and their permissions."
        />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-neutral-600">
                Unable to load user data. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }



  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditUser = (user: User) => {
    console.log('Edit user:', user);
    // Implementation for edit modal would go here
  };

  return (
    <>
      <Header 
        title="User Management" 
        subtitle="Manage team members and their permissions."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="bg-medical-blue hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Administrator</SelectItem>
                                  <SelectItem value="doctor">Doctor</SelectItem>
                                  <SelectItem value="nurse">Nurse</SelectItem>
                                  <SelectItem value="receptionist">Receptionist</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Cardiology" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                          className="bg-medical-blue hover:bg-blue-700"
                        >
                          {createUserMutation.isPending ? 
                            (editingUser ? "Updating..." : "Creating...") : 
                            (editingUser ? "Update User" : "Create User")
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="nurse">Nurses</SelectItem>
                  <SelectItem value="receptionist">Receptionists</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-600">No users found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="medical-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const RoleIcon = roleIcons[user.role as keyof typeof roleIcons];
                      
                      return (
                        <tr key={user.id}>
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarContent className="bg-medical-blue text-white font-semibold">
                                  {getInitials(user.firstName, user.lastName)}
                                </AvatarContent>
                                <AvatarFallback>
                                  {getInitials(user.firstName, user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-neutral-600">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant="secondary"
                              className={`${roleColors[user.role as keyof typeof roleColors]} flex items-center space-x-1 w-fit`}
                            >
                              <RoleIcon className="w-3 h-3" />
                              <span>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-neutral-600">
                            {user.department || "—"}
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant="secondary"
                              className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-neutral-600">
                            {formatLastLogin(user.lastLoginAt)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-medical-blue hover:text-blue-700"
                                onClick={() => handleEditUser(user)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deleteUserMutation.isPending}
                              >
                                {user.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
