import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  User, 
  Calendar,
  Pill,
  Activity,
  MessageSquare,
  X,
  Check,
  Filter,
  Search,
  Trash2,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: "low" | "normal" | "high" | "critical";
  status: "unread" | "read" | "dismissed" | "archived";
  isActionable: boolean;
  actionUrl?: string;
  metadata?: {
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical";
    department?: string;
    icon?: string;
    color?: string;
  };
  createdAt: string;
  readAt?: string;
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Notification dismissed",
        description: "The notification has been dismissed successfully.",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted successfully.",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_reminder":
        return <Calendar className="h-5 w-5" />;
      case "lab_result":
        return <Activity className="h-5 w-5" />;
      case "prescription_alert":
        return <Pill className="h-5 w-5" />;
      case "system_alert":
        return <AlertTriangle className="h-5 w-5" />;
      case "payment_due":
        return <Clock className="h-5 w-5" />;
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "patient_update":
        return <User className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400";
      case "high":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400";
      case "normal":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
      case "low":
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      appointment_reminder: "Appointment Reminder",
      lab_result: "Lab Result",
      prescription_alert: "Prescription Alert",
      system_alert: "System Alert",
      payment_due: "Payment Due",
      message: "Message",
      patient_update: "Patient Update",
    };
    return labels[type] || type;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === "unread") {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      const subdomain = getActiveSubdomain();
      const fullUrl = notification.actionUrl.startsWith('/') 
        ? `/${subdomain}${notification.actionUrl}` 
        : notification.actionUrl;
      navigate(fullUrl);
    }
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const handleDelete = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    deleteMutation.mutate(notificationId);
  };

  const toggleSelectNotification = (notificationId: number) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    const allIds = filteredNotifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  const deselectAll = () => {
    setSelectedNotifications([]);
  };

  const deleteSelected = async () => {
    for (const id of selectedNotifications) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedNotifications([]);
  };

  // Apply filters
  const filteredNotifications = notifications.filter((notification) => {
    // Status filter
    if (statusFilter !== "all" && notification.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== "all" && notification.type !== typeFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && notification.priority !== priorityFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.metadata?.patientName?.toLowerCase().includes(query) ||
        notification.metadata?.department?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter(n => n.status === "unread").length;
  const uniqueTypes = Array.from(new Set(notifications.map(n => n.type)));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all your notifications in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-4 py-2">
            {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800 dark:text-blue-400">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-notifications"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="select-type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedNotifications.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                data-testid="button-deselect-all"
              >
                Deselect all
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-selected"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-400">
              All Notifications ({filteredNotifications.length})
            </CardTitle>
            <CardDescription>
              {filteredNotifications.length === 0 && searchQuery && "No notifications match your search"}
              {filteredNotifications.length === 0 && !searchQuery && "No notifications to display"}
            </CardDescription>
          </div>
          {filteredNotifications.length > 0 && selectedNotifications.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              Select all
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="font-medium text-lg">No notifications found</p>
              <p className="text-sm mt-1">
                {searchQuery 
                  ? "Try adjusting your filters or search query" 
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all ${
                    notification.status === "unread" 
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                      : "bg-white dark:bg-gray-900"
                  } ${
                    selectedNotifications.includes(notification.id)
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleSelectNotification(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      data-testid={`checkbox-notification-${notification.id}`}
                    />

                    {/* Icon */}
                    <div 
                      className={`p-3 rounded-full ${getPriorityColor(notification.priority)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        {notification.status === "unread" && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {notification.priority === "critical" && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                        {notification.priority === "high" && (
                          <Badge className="bg-orange-500">High Priority</Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.metadata?.patientName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {notification.metadata.patientName}
                          </span>
                        )}
                        {notification.metadata?.department && (
                          <Badge variant="secondary" className="text-xs">
                            {notification.metadata.department}
                          </Badge>
                        )}
                        {notification.readAt && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Read {format(new Date(notification.readAt), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {notification.status === "unread" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          disabled={markAsReadMutation.isPending}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDismiss(e, notification.id)}
                        disabled={dismissMutation.isPending}
                        data-testid={`button-dismiss-${notification.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, notification.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${notification.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
