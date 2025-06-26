import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Share
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

  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);
  const { toast } = useToast();

  const handleViewStudy = (study: ImagingStudy) => {
    setSelectedStudy(study);
    toast({
      title: "View Study",
      description: `Opening detailed view for ${study.patientName}`,
    });
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
    toast({
      title: "Share Study",
      description: `Study shared with ${study.patientName} via secure portal`,
    });
  };

  const handleGenerateReport = (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (study) {
      toast({
        title: "Generate Report",
        description: `Report generated for ${study.patientName}`,
      });
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
    </>
  );
}