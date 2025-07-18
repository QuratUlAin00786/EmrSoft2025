import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileImage, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  User,
  FileText,
  Monitor,
  Camera,
  Zap,
  Share,
  Share2,
  Mail,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";

interface ImagingStudy {
  id: string;
  patientId: string;
  patientName: string;
  studyType: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Nuclear Medicine' | 'Mammography';
  bodyPart: string;
  orderedBy: string;
  orderedAt: string;
  scheduledAt?: string;
  performedAt?: string;
  status: 'ordered' | 'scheduled' | 'in_progress' | 'completed' | 'preliminary' | 'final' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  indication: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  images: Array<{
    id: string;
    type: 'DICOM' | 'JPEG' | 'PNG';
    seriesDescription: string;
    imageCount: number;
    size: string;
  }>;
  report?: {
    status: 'preliminary' | 'final';
    content: string;
    dictatedAt: string;
    signedAt?: string;
  };
}

const mockImagingStudies: ImagingStudy[] = [
  {
    id: "img_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    studyType: "Chest X-Ray PA and Lateral",
    modality: "X-Ray",
    bodyPart: "Chest",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-15T09:00:00Z",
    scheduledAt: "2024-01-15T14:00:00Z",
    performedAt: "2024-01-15T14:15:00Z",
    status: "final",
    priority: "routine",
    indication: "Chronic cough, rule out pneumonia",
    findings: "Lungs are clear bilaterally. No acute cardiopulmonary abnormality. Heart size normal.",
    impression: "Normal chest X-ray.",
    radiologist: "Dr. Michael Chen",
    images: [
      {
        id: "series_001",
        type: "DICOM",
        seriesDescription: "PA View",
        imageCount: 1,
        size: "2.1 MB"
      },
      {
        id: "series_002",
        type: "DICOM",
        seriesDescription: "Lateral View",
        imageCount: 1,
        size: "2.3 MB"
      }
    ],
    report: {
      status: "final",
      content: "EXAMINATION: Chest X-ray PA and Lateral\n\nINDICATION: Chronic cough, rule out pneumonia\n\nFINDINGS: The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration. The mediastinal contours are normal. No acute bony abnormalities are identified.\n\nIMPRESSION: Normal chest X-ray.",
      dictatedAt: "2024-01-15T15:30:00Z",
      signedAt: "2024-01-15T15:45:00Z"
    }
  },
  {
    id: "img_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    studyType: "CT Abdomen and Pelvis with Contrast",
    modality: "CT",
    bodyPart: "Abdomen/Pelvis",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-14T10:00:00Z",
    scheduledAt: "2024-01-16T09:00:00Z",
    status: "scheduled",
    priority: "urgent",
    indication: "Abdominal pain, rule out appendicitis",
    images: []
  },
  {
    id: "img_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    studyType: "Brain MRI without Contrast",
    modality: "MRI",
    bodyPart: "Brain",
    orderedBy: "Dr. Michael Chen",
    orderedAt: "2024-01-13T11:00:00Z",
    performedAt: "2024-01-14T10:30:00Z",
    status: "preliminary",
    priority: "routine",
    indication: "Headaches, rule out structural abnormality",
    radiologist: "Dr. Lisa Park",
    images: [
      {
        id: "series_003",
        type: "DICOM",
        seriesDescription: "T1 Sagittal",
        imageCount: 25,
        size: "45.2 MB"
      },
      {
        id: "series_004",
        type: "DICOM",
        seriesDescription: "T2 Axial",
        imageCount: 30,
        size: "52.8 MB"
      },
      {
        id: "series_005",
        type: "DICOM",
        seriesDescription: "FLAIR Axial",
        imageCount: 28,
        size: "48.6 MB"
      }
    ],
    report: {
      status: "preliminary",
      content: "PRELIMINARY REPORT - AWAITING FINAL REVIEW\n\nEXAMINATION: Brain MRI without contrast\n\nINDICATION: Headaches, rule out structural abnormality\n\nFINDINGS: Preliminary review shows no acute intracranial abnormality. No mass lesion, hemorrhage, or midline shift identified. Ventricular system appears normal.\n\nIMPRESSION: Preliminary - No acute intracranial abnormality.",
      dictatedAt: "2024-01-14T16:00:00Z"
    }
  }
];

export default function ImagingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFinalReportDialog, setShowFinalReportDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    findings: "",
    impression: "",
    radiologist: ""
  });
  const [uploadFormData, setUploadFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine"
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageSeries, setSelectedImageSeries] = useState<any>(null);
  const { toast } = useToast();

  // Fetch patients using the exact working pattern from prescriptions
  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      // Remove duplicates based on patient ID
      const uniquePatients = data ? data.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => p.id === patient.id)
      ) : [];
      setPatients(uniquePatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (showNewOrder || showUploadDialog) {
      fetchPatients();
    }
  }, [showNewOrder, showUploadDialog]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileList = Array.from(files).filter(file => 
        file.type.includes('image/') || 
        file.type.includes('application/dicom') || 
        file.name.toLowerCase().includes('.dcm')
      );
      setSelectedFiles(fileList);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFormData.patientId || !uploadFormData.studyType || selectedFiles.length === 0) {
      toast({
        title: "Upload Failed",
        description: "Please fill in all required fields and select images to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the selected patient to get the numeric ID
      const selectedPatient = patients.find(p => p.patientId === uploadFormData.patientId);
      if (!selectedPatient) {
        toast({
          title: "Upload Failed",
          description: "Selected patient not found",
          variant: "destructive",
        });
        return;
      }

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Create a mock file URL (in a real app, you'd upload to cloud storage)
        const fileUrl = `https://storage.example.com/medical-images/${Date.now()}-${file.name}`;
        
        const imageData = {
          patientId: selectedPatient.id, // Use the numeric database ID
          imageType: uploadFormData.studyType,
          bodyPart: uploadFormData.bodyPart || "Not specified",
          notes: uploadFormData.indication || "",
          filename: file.name,
          fileUrl: fileUrl,
          fileSize: file.size,
          uploadedBy: 348 // Current user ID (admin)
        };

        await apiRequest("POST", "/api/medical-images", imageData);
      }

      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

      toast({
        title: "Images Uploaded Successfully",
        description: `${selectedFiles.length} images (${totalSizeMB} MB) uploaded for ${selectedPatient.firstName} ${selectedPatient.lastName}`,
      });

      // Reset form and close dialog
      setUploadFormData({
        patientId: "",
        studyType: "",
        modality: "X-Ray",
        bodyPart: "",
        indication: "",
        priority: "routine"
      });
      setSelectedFiles([]);
      setShowUploadDialog(false);
      
      // Refresh the medical images list if needed
      // This would trigger a re-fetch of imaging studies
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewStudy = (study: ImagingStudy) => {
    setSelectedStudy(study);
    setShowViewDialog(true);
  };

  const handleDownloadStudy = (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (study) {
      toast({
        title: "Download Study",
        description: `DICOM images for ${study.patientName} downloaded successfully`,
      });
      
      // Simulate DICOM download
      const blob = new Blob([`DICOM Study Report\n\nPatient: ${study.patientName}\nStudy: ${study.studyType}\nModality: ${study.modality}\nDate: ${new Date(study.orderedAt).toLocaleDateString()}\n\nImages: ${study.images?.length || 0} series available`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dicom-study-${study.patientName.replace(' ', '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareStudy = (study: ImagingStudy) => {
    setSelectedStudy(study);
    setShowShareDialog(true);
    setShareFormData({
      method: "",
      email: "",
      whatsapp: "",
      message: `Imaging study results for ${study.studyType} are now available for review.`
    });
  };

  const handleGenerateReport = (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (study) {
      setSelectedStudy(study);
      setReportFormData({
        findings: study.findings || "",
        impression: study.impression || "",
        radiologist: study.radiologist || "Dr. Michael Chen"
      });
      setShowReportDialog(true);
    }
  };

  const { data: studies = mockImagingStudies, isLoading } = useQuery({
    queryKey: ["/api/imaging", statusFilter, modalityFilter],
    enabled: true,
  });

  const filteredStudies = (studies as any || []).filter((study: any) => {
    const matchesSearch = !searchQuery || 
      study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.studyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || study.status === statusFilter;
    const matchesModality = modalityFilter === "all" || study.modality === modalityFilter;
    
    return matchesSearch && matchesStatus && matchesModality;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final': return 'bg-green-100 text-green-800';
      case 'preliminary': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'scheduled': return 'bg-cyan-100 text-cyan-800';
      case 'ordered': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'X-Ray': return <Camera className="h-4 w-4" />;
      case 'CT': return <Monitor className="h-4 w-4" />;
      case 'MRI': return <Zap className="h-4 w-4" />;
      case 'Ultrasound': return <FileImage className="h-4 w-4" />;
      default: return <FileImage className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Medical Imaging" 
        subtitle="View and manage radiology studies and reports"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                    <p className="text-2xl font-bold">5</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Studies</p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Urgent Studies</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">142</p>
                  </div>
                  <FileImage className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search imaging studies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="preliminary">Preliminary</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={modalityFilter} onValueChange={setModalityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modalities</SelectItem>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setShowNewOrder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Order Study
                </Button>
                <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Imaging Studies List */}
          <div className="space-y-4">
            {filteredStudies.map((study: any) => (
              <Card key={study.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getModalityIcon(study.modality)}
                          <h3 className="text-lg font-semibold">{study.patientName}</h3>
                        </div>
                        <Badge className={getStatusColor(study.status)}>
                          {study.status}
                        </Badge>
                        <Badge className={getPriorityColor(study.priority)}>
                          {study.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Study Information</h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>Study:</strong> {study.studyType}</div>
                            <div><strong>Modality:</strong> {study.modality}</div>
                            <div><strong>Body Part:</strong> {study.bodyPart}</div>
                            <div><strong>Ordered by:</strong> {study.orderedBy}</div>
                            <div><strong>Indication:</strong> {study.indication}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Timeline</h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>Ordered:</strong> {format(new Date(study.orderedAt), 'MMM d, yyyy HH:mm')}</div>
                            {study.scheduledAt && (
                              <div><strong>Scheduled:</strong> {format(new Date(study.scheduledAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                            {study.performedAt && (
                              <div><strong>Performed:</strong> {format(new Date(study.performedAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                            {study.radiologist && (
                              <div><strong>Radiologist:</strong> {study.radiologist}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {study.images && study.images.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Image Series</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {study.images.map((series: any) => (
                              <div key={series.id} className="bg-gray-50 p-3 rounded-lg">
                                <div className="font-medium text-sm">{series.seriesDescription}</div>
                                <div className="text-xs text-gray-600">
                                  {series.imageCount} images • {series.size} • {series.type}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {study.findings && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                          <h4 className="font-medium text-blue-800 text-sm mb-1">Findings</h4>
                          <p className="text-sm text-blue-700">{study.findings}</p>
                          {study.impression && (
                            <>
                              <h4 className="font-medium text-blue-800 text-sm mb-1 mt-2">Impression</h4>
                              <p className="text-sm text-blue-700">{study.impression}</p>
                            </>
                          )}
                        </div>
                      )}

                      {study.report && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-green-800 text-sm">Report</h4>
                            <Badge className={study.report.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {study.report.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-green-700">
                            <strong>Dictated:</strong> {format(new Date(study.report.dictatedAt), 'MMM d, yyyy HH:mm')}
                            {study.report.signedAt && (
                              <span className="ml-4">
                                <strong>Signed:</strong> {format(new Date(study.report.signedAt), 'MMM d, yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleViewStudy(study)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadStudy(study.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShareStudy(study)}>
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateReport(study.id)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudies.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No imaging studies found</h3>
              <p className="text-gray-600">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Share Study Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Share study for <strong>{selectedStudy.patientName}</strong>
              </div>

              <div>
                <Label htmlFor="method" className="text-sm font-medium">
                  Contact Method
                </Label>
                <Select value={shareFormData.method} onValueChange={(value) => setShareFormData({...shareFormData, method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shareFormData.method === "email" && (
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={shareFormData.email}
                    onChange={(e) => setShareFormData({...shareFormData, email: e.target.value})}
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-medium">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={shareFormData.whatsapp}
                    onChange={(e) => setShareFormData({...shareFormData, whatsapp: e.target.value})}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Add a custom message..."
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData({...shareFormData, message: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const method = shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact = shareFormData.method === "email" ? shareFormData.email : shareFormData.whatsapp;
                    
                    toast({
                      title: "Study Shared",
                      description: `Imaging study sent to ${selectedStudy.patientName} via ${method} (${contact})`,
                    });
                    setShowShareDialog(false);
                    setShareFormData({
                      method: "",
                      email: "",
                      whatsapp: "",
                      message: ""
                    });
                  }}
                  disabled={!shareFormData.method || 
                    (shareFormData.method === "email" && !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" && !shareFormData.whatsapp)}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share Study
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{selectedStudy.patientName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedStudy.patientName}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedStudy.patientId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Study:</strong> {selectedStudy.studyType}</div>
                  <div><strong>Modality:</strong> {selectedStudy.modality}</div>
                  <div><strong>Body Part:</strong> {selectedStudy.bodyPart}</div>
                  <div><strong>Indication:</strong> {selectedStudy.indication}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="findings" className="text-sm font-medium">
                    Findings
                  </Label>
                  <Textarea
                    id="findings"
                    placeholder="Enter radiological findings..."
                    value={reportFormData.findings}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, findings: e.target.value }))}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="impression" className="text-sm font-medium">
                    Impression
                  </Label>
                  <Textarea
                    id="impression"
                    placeholder="Enter clinical impression..."
                    value={reportFormData.impression}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, impression: e.target.value }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="radiologist" className="text-sm font-medium">
                    Radiologist
                  </Label>
                  <Input
                    id="radiologist"
                    value={reportFormData.radiologist}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, radiologist: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {selectedStudy.report && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Existing Report</h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div><strong>Status:</strong> {selectedStudy.report.status}</div>
                      <div><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</div>
                      {selectedStudy.report.signedAt && (
                        <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Download existing report logic
                      const reportContent = selectedStudy.report?.content || 
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${new Date(selectedStudy.orderedAt).toLocaleDateString()}\n\nFindings: ${selectedStudy.findings || 'To be documented'}\n\nImpression: ${selectedStudy.impression || 'To be documented'}\n\nRadiologist: ${selectedStudy.radiologist || 'Dr. Michael Chen'}`;
                      
                      const blob = new Blob([reportContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(' ', '-').toLowerCase()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Report Downloaded",
                        description: `Radiology report for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedStudy.status === 'final') {
                        setShowReportDialog(false);
                        setShowFinalReportDialog(true);
                      } else {
                        toast({
                          title: "Report Generated",
                          description: `Radiology report for ${selectedStudy.patientName} has been generated and signed`,
                        });
                        setShowReportDialog(false);
                      }
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedStudy.status === 'final' ? 'View Final Report' : 'Generate Report'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Study Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{selectedStudy.patientName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">{selectedStudy.patientName}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedStudy.patientId}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedStudy.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedStudy.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      selectedStudy.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedStudy.status.charAt(0).toUpperCase() + selectedStudy.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div><strong>Study Type:</strong> {selectedStudy.studyType}</div>
                  <div><strong>Modality:</strong> {selectedStudy.modality}</div>
                  <div><strong>Body Part:</strong> {selectedStudy.bodyPart}</div>
                  <div><strong>Priority:</strong> {selectedStudy.priority}</div>
                  <div><strong>Ordered By:</strong> {selectedStudy.orderedBy}</div>
                  <div><strong>Ordered:</strong> {format(new Date(selectedStudy.orderedAt), "MMM dd, yyyy")}</div>
                  {selectedStudy.scheduledAt && (
                    <div><strong>Scheduled:</strong> {format(new Date(selectedStudy.scheduledAt), "MMM dd, yyyy")}</div>
                  )}
                  {selectedStudy.performedAt && (
                    <div><strong>Performed:</strong> {format(new Date(selectedStudy.performedAt), "MMM dd, yyyy")}</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg mb-2">Clinical Indication</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.indication}</p>
                </div>

                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Findings</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.findings}</p>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Impression</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.impression}</p>
                  </div>
                )}

                {selectedStudy.radiologist && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Radiologist</h4>
                    <p className="text-gray-700">{selectedStudy.radiologist}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-lg mb-3">Image Series</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudy.images.map((image, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{image.seriesDescription}</h5>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{image.type}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Images: {image.imageCount}</div>
                        <div>Size: {image.size}</div>
                      </div>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedImageSeries(image);
                            setShowImageViewer(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Images
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudy.report && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Report Status</h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span><strong>Status:</strong> {selectedStudy.report.status}</span>
                      <span><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</span>
                    </div>
                    {selectedStudy.report.signedAt && (
                      <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowShareDialog(true);
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Study
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowReportDialog(true);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button 
                    onClick={() => {
                      // Download study logic
                      const studyData = `IMAGING STUDY SUMMARY\n\nPatient: ${selectedStudy.patientName}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${new Date(selectedStudy.orderedAt).toLocaleDateString()}\n\nIndication: ${selectedStudy.indication}\n\nFindings: ${selectedStudy.findings || 'Pending'}\n\nImpression: ${selectedStudy.impression || 'Pending'}\n\nRadiologist: ${selectedStudy.radiologist || 'TBD'}`;
                      
                      const blob = new Blob([studyData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `imaging-study-${selectedStudy.patientName.replace(' ', '-').toLowerCase()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Study Downloaded",
                        description: `Study summary for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Study
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Study Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Imaging Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient" className="text-sm font-medium">
                  Patient
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsLoading ? (
                      <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                    ) : patients.length > 0 ? (
                      patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="modality" className="text-sm font-medium">
                  Modality
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bodyPart" className="text-sm font-medium">
                  Body Part
                </Label>
                <Input
                  id="bodyPart"
                  placeholder="e.g., Chest, Abdomen, Head"
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="studyType" className="text-sm font-medium">
                Study Description
              </Label>
              <Input
                id="studyType"
                placeholder="e.g., Chest X-Ray PA and Lateral"
              />
            </div>

            <div>
              <Label htmlFor="indication" className="text-sm font-medium">
                Clinical Indication
              </Label>
              <Textarea
                id="indication"
                placeholder="Reason for imaging study..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for the imaging technologist..."
                rows={2}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Study Ordered",
                    description: "Imaging study has been successfully ordered and will be scheduled",
                  });
                  setShowNewOrder(false);
                }}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Order Study
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Report Viewer Dialog */}
      <Dialog open={showFinalReportDialog} onOpenChange={setShowFinalReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Final Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient Name:</span> {selectedStudy.patientName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span> {selectedStudy.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Study Date:</span> {format(new Date(selectedStudy.orderedAt), "PPP")}
                  </div>
                  <div>
                    <span className="font-medium">Study Type:</span> {selectedStudy.studyType}
                  </div>
                  <div>
                    <span className="font-medium">Modality:</span> {selectedStudy.modality}
                  </div>
                  <div>
                    <span className="font-medium">Body Part:</span> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <span className="font-medium">Ordering Physician:</span> {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <span className="font-medium">Radiologist:</span> {selectedStudy.radiologist || "Dr. Michael Chen"}
                  </div>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Clinical Information</h3>
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="font-medium">Indication:</span> {selectedStudy.indication}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedStudy.priority === 'stat' ? 'bg-red-100 text-red-800' :
                      selectedStudy.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedStudy.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Report</h3>
                
                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium mb-2">FINDINGS:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.findings}
                    </div>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium mb-2">IMPRESSION:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.impression}
                    </div>
                  </div>
                )}

                {selectedStudy.report && (
                  <div>
                    <h4 className="font-medium mb-2">FULL REPORT:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.report.content}
                    </div>
                  </div>
                )}

                {/* Report Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800">Report Status: FINAL</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    {selectedStudy.report?.dictatedAt && (
                      <div><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</div>
                    )}
                    {selectedStudy.report?.signedAt && (
                      <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                    )}
                    <div><strong>Radiologist:</strong> {selectedStudy.radiologist || "Dr. Michael Chen"}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowFinalReportDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Download report logic
                      const reportContent = selectedStudy.report?.content || 
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nPatient ID: ${selectedStudy.patientId}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${format(new Date(selectedStudy.orderedAt), "PPP")}\nBody Part: ${selectedStudy.bodyPart}\nOrdering Physician: ${selectedStudy.orderedBy}\nRadiologist: ${selectedStudy.radiologist || "Dr. Michael Chen"}\n\nCLINICAL INDICATION:\n${selectedStudy.indication}\n\nFINDINGS:\n${selectedStudy.findings || "Normal findings"}\n\nIMPRESSION:\n${selectedStudy.impression || "No acute abnormalities"}`;
                      
                      const blob = new Blob([reportContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(selectedStudy.orderedAt), "yyyy-MM-dd")}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Report Downloaded",
                        description: `Final report for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowFinalReportDialog(false);
                      setShowShareDialog(true);
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Images Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Medical Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Patient Selection */}
            <div>
              <Label htmlFor="upload-patient">Patient *</Label>
              <Select value={uploadFormData.patientId} onValueChange={(value) => setUploadFormData({...uploadFormData, patientId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading">Loading patients...</SelectItem>
                  ) : patients.length === 0 ? (
                    <SelectItem value="no-patients">No patients available</SelectItem>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName} ({patient.patientId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Study Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-modality">Modality *</Label>
                <Select value={uploadFormData.modality} onValueChange={(value) => setUploadFormData({...uploadFormData, modality: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="upload-priority">Priority</Label>
                <Select value={uploadFormData.priority} onValueChange={(value) => setUploadFormData({...uploadFormData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="upload-study-type">Study Type *</Label>
              <Input
                id="upload-study-type"
                value={uploadFormData.studyType}
                onChange={(e) => setUploadFormData({...uploadFormData, studyType: e.target.value})}
                placeholder="e.g., Chest X-Ray PA and Lateral"
              />
            </div>

            <div>
              <Label htmlFor="upload-body-part">Body Part</Label>
              <Input
                id="upload-body-part"
                value={uploadFormData.bodyPart}
                onChange={(e) => setUploadFormData({...uploadFormData, bodyPart: e.target.value})}
                placeholder="e.g., Chest, Abdomen, Left Hand"
              />
            </div>

            <div>
              <Label htmlFor="upload-indication">Clinical Indication</Label>
              <Textarea
                id="upload-indication"
                value={uploadFormData.indication}
                onChange={(e) => setUploadFormData({...uploadFormData, indication: e.target.value})}
                placeholder="Reason for imaging study..."
                rows={2}
              />
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="upload-files">Medical Images *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <div className="space-y-2">
                  <div>
                    <input
                      type="file"
                      id="upload-files"
                      multiple
                      accept="image/*,.dcm,.dicom"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('upload-files')?.click()}
                    >
                      Select Images
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Select X-ray images, DICOM files, or other medical images
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported formats: JPEG, PNG, DICOM (.dcm)
                  </p>
                </div>
              </div>
              
              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Selected Files ({selectedFiles.length}):</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadSubmit}
                className="bg-medical-blue hover:bg-blue-700"
                disabled={!uploadFormData.patientId || !uploadFormData.studyType || selectedFiles.length === 0}
              >
                <FileImage className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Medical Image Viewer</DialogTitle>
            {selectedImageSeries && (
              <p className="text-sm text-gray-600">
                {selectedImageSeries.seriesDescription} - {selectedImageSeries.imageCount} images
              </p>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {selectedImageSeries && (
              <div className="space-y-4">
                {/* Series Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Series:</strong> {selectedImageSeries.seriesDescription}</div>
                    <div><strong>Type:</strong> {selectedImageSeries.type}</div>
                    <div><strong>Images:</strong> {selectedImageSeries.imageCount}</div>
                    <div><strong>Size:</strong> {selectedImageSeries.size}</div>
                  </div>
                </div>

                {/* Image Display Area */}
                <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-white space-y-4">
                    <div className="w-16 h-16 mx-auto border-2 border-white rounded-lg flex items-center justify-center">
                      <FileImage className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Medical Image Display</h3>
                      <p className="text-gray-300 text-sm">
                        Viewing {selectedImageSeries.seriesDescription}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
                        {selectedImageSeries.type} format • {selectedImageSeries.imageCount} images • {selectedImageSeries.size}
                      </p>
                    </div>
                    
                    {/* Sample Image Thumbnails */}
                    <div className="grid grid-cols-3 gap-2 mt-6 max-w-md mx-auto">
                      {Array.from({length: Math.min(6, selectedImageSeries.imageCount)}).map((_, index) => (
                        <div key={index} className="bg-gray-800 rounded p-4 h-20 flex items-center justify-center border border-gray-600">
                          <span className="text-xs text-gray-400">Image {index + 1}</span>
                        </div>
                      ))}
                    </div>

                    {/* Image Controls */}
                    <div className="flex justify-center space-x-2 mt-4">
                      <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Next
                      </Button>
                      <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Zoom In
                      </Button>
                      <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Zoom Out
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Image Tools */}
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Image 1 of {selectedImageSeries.imageCount}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowImageViewer(false)}>
              Close Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}