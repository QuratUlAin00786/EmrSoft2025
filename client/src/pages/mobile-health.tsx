import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Smartphone,
  Watch,
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  Battery,
  Wifi,
  Bluetooth,
  Cloud,
  Bell,
  Settings,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Play,
  QrCode,
  Share2,
  Globe,
  Calendar,
  MessageSquare,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface WearableDevice {
  id: string;
  patientId: string;
  patientName: string;
  deviceType: 'fitness_tracker' | 'smartwatch' | 'glucose_monitor' | 'blood_pressure' | 'pulse_oximeter';
  brand: string;
  model: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  batteryLevel: number;
  lastSync: string;
  dataTypes: string[];
  readings: Array<{
    timestamp: string;
    type: string;
    value: number;
    unit: string;
    status: 'normal' | 'abnormal' | 'critical';
  }>;
}

interface MobileApp {
  id: string;
  name: string;
  description: string;
  category: 'patient_portal' | 'medication_tracker' | 'symptom_tracker' | 'appointment_booking';
  platform: 'ios' | 'android' | 'pwa';
  version: string;
  downloads: number;
  rating: number;
  features: string[];
  screenshots: string[];
}

interface PushNotification {
  id: string;
  patientId: string;
  patientName: string;
  type: 'appointment_reminder' | 'medication_reminder' | 'health_alert' | 'lab_results';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledTime: string;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed';
  deliveryTime?: string;
}

export default function MobileHealth() {
  const [activeTab, setActiveTab] = useState("devices");
  const [selectedDevice, setSelectedDevice] = useState<WearableDevice | null>(null);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [deviceToConfig, setDeviceToConfig] = useState<WearableDevice | null>(null);
  const { toast } = useToast();

  // Test: Return simple JSX first to isolate the issue
  if (true) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Mobile Health</h1>
          <p>Testing basic component rendering...</p>
        </div>
      </div>
    );
  }

  // Fetch wearable devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/mobile-health/devices"],
    enabled: true
  });

  // Fetch mobile apps
  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ["/api/mobile-health/apps"],
    enabled: true
  });

  // Fetch push notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/mobile-health/notifications"],
    enabled: true
  });

  // Sync device mutation
  const syncDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/mobile-health/devices/${deviceId}/sync`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to sync device");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-health/devices"] });
      toast({ title: "Device synced successfully" });
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationData: Partial<PushNotification>) => {
      const response = await fetch("/api/mobile-health/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to send notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-health/notifications"] });
      toast({ title: "Notification sent successfully" });
    }
  });

  // Mock data
  const mockDevices: WearableDevice[] = [
    {
      id: "device_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      deviceType: "smartwatch",
      brand: "Apple",
      model: "Watch Series 9",
      status: "connected",
      batteryLevel: 78,
      lastSync: "2024-06-26T15:30:00Z",
      dataTypes: ["Heart Rate", "Steps", "Sleep", "ECG"],
      readings: [
        {
          timestamp: "2024-06-26T15:30:00Z",
          type: "heart_rate",
          value: 72,
          unit: "bpm",
          status: "normal"
        },
        {
          timestamp: "2024-06-26T15:30:00Z",
          type: "steps",
          value: 8456,
          unit: "steps",
          status: "normal"
        }
      ]
    },
    {
      id: "device_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      deviceType: "glucose_monitor",
      brand: "Dexcom",
      model: "G7",
      status: "connected",
      batteryLevel: 92,
      lastSync: "2024-06-26T15:45:00Z",
      dataTypes: ["Blood Glucose", "Trends"],
      readings: [
        {
          timestamp: "2024-06-26T15:45:00Z",
          type: "glucose",
          value: 142,
          unit: "mg/dL",
          status: "abnormal"
        }
      ]
    },
    {
      id: "device_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      deviceType: "blood_pressure",
      brand: "Omron",
      model: "HeartGuide",
      status: "disconnected",
      batteryLevel: 15,
      lastSync: "2024-06-25T08:20:00Z",
      dataTypes: ["Blood Pressure", "Heart Rate"],
      readings: []
    }
  ];

  const mockApps: MobileApp[] = [
    {
      id: "app_1",
      name: "Averox Patient Portal",
      description: "Complete patient portal with appointment booking, messaging, and health records",
      category: "patient_portal",
      platform: "pwa",
      version: "2.1.0",
      downloads: 15420,
      rating: 4.8,
      features: [
        "Appointment Booking",
        "Secure Messaging",
        "Lab Results",
        "Prescription Management",
        "Health Records",
        "Telehealth Integration"
      ],
      screenshots: []
    },
    {
      id: "app_2",
      name: "Averox Medication Tracker",
      description: "Smart medication reminders with dose tracking and refill alerts",
      category: "medication_tracker",
      platform: "ios",
      version: "1.5.2",
      downloads: 8930,
      rating: 4.6,
      features: [
        "Medication Reminders",
        "Dose Tracking",
        "Refill Alerts",
        "Drug Interaction Warnings",
        "Pill Recognition"
      ],
      screenshots: []
    }
  ];

  const mockNotifications: PushNotification[] = [
    {
      id: "notif_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      type: "appointment_reminder",
      title: "Appointment Reminder",
      message: "You have an appointment tomorrow at 10:00 AM with Dr. Emily Watson",
      priority: "normal",
      scheduledTime: "2024-06-27T09:00:00Z",
      status: "scheduled"
    },
    {
      id: "notif_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      type: "health_alert",
      title: "Blood Glucose Alert",
      message: "Your blood glucose reading of 180 mg/dL is elevated. Please check your levels.",
      priority: "high",
      scheduledTime: "2024-06-26T16:00:00Z",
      status: "delivered",
      deliveryTime: "2024-06-26T16:00:12Z"
    }
  ];

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "smartwatch": return Watch;
      case "fitness_tracker": return Activity;
      case "glucose_monitor": return Heart;
      case "blood_pressure": return Heart;
      case "pulse_oximeter": return Activity;
      default: return Smartphone;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800";
      case "syncing": return "bg-blue-100 text-blue-800";
      case "disconnected": return "bg-gray-100 text-gray-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mobile Health</h1>
          <p className="text-gray-600 mt-1">Wearable devices, mobile apps, and patient engagement</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Smartphone className="w-4 h-4 mr-2" />
                Connect Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Wearable Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center p-6">
                  <QrCode className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    Scan this QR code with your device's companion app to connect
                  </p>
                </div>
                <Button className="w-full">Generate Pairing Code</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Apps
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">Wearable Devices</TabsTrigger>
          <TabsTrigger value="apps">Mobile Apps</TabsTrigger>
          <TabsTrigger value="notifications">Push Notifications</TabsTrigger>
          <TabsTrigger value="offline">Offline Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4">
            {mockDevices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.deviceType);
              return (
                <Card key={device.id} className={device.status === 'error' ? 'border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="w-8 h-8 text-blue-500" />
                        <div>
                          <CardTitle className="text-lg">{device.brand} {device.model}</CardTitle>
                          <p className="text-sm text-gray-600">{device.patientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(device.status)}>
                          {device.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Battery className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          <span className={`text-sm ${getBatteryColor(device.batteryLevel)}`}>
                            {device.batteryLevel}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Device Type</div>
                        <div className="font-medium capitalize">
                          {device.deviceType.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Last Sync</div>
                        <div className="font-medium">
                          {format(new Date(device.lastSync), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Data Types</div>
                        <div className="font-medium">{device.dataTypes.length} types</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Latest Readings</div>
                        <div className="font-medium">{device.readings.length} readings</div>
                      </div>
                    </div>

                    {device.readings.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recent Data</h4>
                        <div className="space-y-2">
                          {device.readings.map((reading, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span className="text-sm capitalize">
                                  {reading.type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {reading.value} {reading.unit}
                                </span>
                                <Badge 
                                  className={reading.status === 'normal' ? 
                                    'bg-green-100 text-green-800' : 
                                    'bg-orange-100 text-orange-800'
                                  }
                                >
                                  {reading.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => syncDeviceMutation.mutate(device.id)}
                        disabled={syncDeviceMutation.isPending || device.status === 'syncing'}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Sync Now
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setDeviceToConfig(device);
                          setConfigureOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configure
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedDevice(device)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid gap-4">
            {mockApps.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-blue-500" />
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <p className="text-sm text-gray-600">{app.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                            ★
                          </span>
                        ))}
                        <span className="text-sm text-gray-600 ml-1">{app.rating}</span>
                      </div>
                      <div className="text-sm text-gray-500">{app.downloads.toLocaleString()} downloads</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Category</div>
                      <div className="font-medium capitalize">
                        {app.category.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Platform</div>
                      <div className="font-medium uppercase">{app.platform}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Version</div>
                      <div className="font-medium">{app.version}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Features</div>
                      <div className="font-medium">{app.features.length} features</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Key Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {app.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Simulate download
                        const link = document.createElement('a');
                        link.href = '#';
                        link.download = `${app.name.replace(/\s+/g, '_')}_v${app.version}.${app.platform === 'pwa' ? 'zip' : 'ipa'}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        toast({
                          title: "Download Started",
                          description: `${app.name} v${app.version} is downloading...`,
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "App Preview",
                          description: `Opening ${app.name} preview in new window...`,
                        });
                        // Simulate opening preview
                        window.open(`/app-preview/${app.id}`, '_blank', 'width=400,height=700');
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/apps/${app.id}`;
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(shareUrl);
                          } else {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = shareUrl;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          }
                          toast({
                            title: "Share Link Copied",
                            description: `${app.name} share link copied to clipboard`,
                          });
                        } catch (error) {
                          toast({
                            title: "Share Link Ready",
                            description: `${app.name} share link: ${shareUrl}`,
                          });
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Push Notifications</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Bell className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Push Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Patient</label>
                    <Input placeholder="Select patient" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Input placeholder="Notification type" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Input placeholder="Notification message" className="mt-1" />
                  </div>
                  <Button className="w-full">Send Notification</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {mockNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{notification.patientName}</h3>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-sm text-gray-600">{notification.message}</div>
                        <div className="text-xs text-gray-500">
                          Scheduled: {format(new Date(notification.scheduledTime), 'MMM dd, yyyy HH:mm')}
                          {notification.deliveryTime && (
                            <span className="ml-2">
                              • Delivered: {format(new Date(notification.deliveryTime), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {notification.status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : notification.status === 'failed' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Activity className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Progressive Web App (PWA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Enable offline functionality for essential features when internet connectivity is limited.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Offline Features</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      View patient records
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Add clinical notes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Access medication lists
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      View appointment schedule
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Storage Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cache Storage</span>
                      <span>45 MB / 100 MB</span>
                    </div>
                    <Progress value={45} />
                    <div className="flex justify-between text-sm">
                      <span>Offline Patients</span>
                      <span>126 records</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Install PWA
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Offline
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Details Modal */}
      {selectedDevice && (
        <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDevice.brand} {selectedDevice.model} - {selectedDevice.patientName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <Badge className={getStatusColor(selectedDevice.status)}>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Battery</div>
                  <div className="flex items-center gap-2">
                    <Battery className={`w-4 h-4 ${getBatteryColor(selectedDevice.batteryLevel)}`} />
                    <span>{selectedDevice.batteryLevel}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Data Types</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDevice.dataTypes.map((type, idx) => (
                    <Badge key={idx} variant="outline">{type}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => syncDeviceMutation.mutate(selectedDevice.id)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Sync Device
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDeviceToConfig(selectedDevice);
                    setConfigureOpen(true);
                    setSelectedDevice(null);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Configure Device Dialog */}
      <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Device - {deviceToConfig?.brand} {deviceToConfig?.model}</DialogTitle>
          </DialogHeader>
          {deviceToConfig && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{deviceToConfig.patientName}</p>
                <p className="text-sm text-gray-600">
                  Device Type: {deviceToConfig.deviceType.replace('_', ' ')}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(deviceToConfig.status)}>
                    {deviceToConfig.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Battery className={`w-4 h-4 ${getBatteryColor(deviceToConfig.batteryLevel)}`} />
                    <span className={`text-sm ${getBatteryColor(deviceToConfig.batteryLevel)}`}>
                      {deviceToConfig.batteryLevel}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Sync Frequency</label>
                <Select defaultValue="every_hour">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_time">Real-time</SelectItem>
                    <SelectItem value="every_15min">Every 15 minutes</SelectItem>
                    <SelectItem value="every_hour">Every hour</SelectItem>
                    <SelectItem value="every_4hours">Every 4 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Data Collection</label>
                <div className="space-y-2 mt-2">
                  {deviceToConfig.dataTypes.map((dataType, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{dataType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Alert Thresholds</label>
                <div className="space-y-3 mt-2">
                  {deviceToConfig.deviceType === 'smartwatch' || deviceToConfig.deviceType === 'fitness_tracker' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600">Heart Rate Max</label>
                          <Input type="number" defaultValue="120" placeholder="BPM" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Heart Rate Min</label>
                          <Input type="number" defaultValue="60" placeholder="BPM" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Daily Steps Goal</label>
                        <Input type="number" defaultValue="8000" placeholder="Steps" />
                      </div>
                    </>
                  ) : deviceToConfig.deviceType === 'blood_pressure' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Systolic Max</label>
                        <Input type="number" defaultValue="140" placeholder="mmHg" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Diastolic Max</label>
                        <Input type="number" defaultValue="90" placeholder="mmHg" />
                      </div>
                    </div>
                  ) : deviceToConfig.deviceType === 'glucose_monitor' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Glucose High</label>
                        <Input type="number" defaultValue="180" placeholder="mg/dL" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Glucose Low</label>
                        <Input type="number" defaultValue="70" placeholder="mg/dL" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-600">Custom Alert Value</label>
                      <Input type="number" placeholder="Enter threshold value" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notification Settings</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Critical alerts</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Daily summaries</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Weekly reports</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Low battery warnings</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Auto-sync When</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Device is charged</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Connected to Wi-Fi</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Patient is at clinic</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setConfigureOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Device Configured",
                    description: `Settings updated for ${deviceToConfig?.brand} ${deviceToConfig?.model}`,
                  });
                  setConfigureOpen(false);
                }}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}