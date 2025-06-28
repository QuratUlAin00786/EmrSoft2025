import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { AdvancedFormBuilder, FormTemplate } from "@/components/forms/advanced-form-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  FileText, 
  BarChart3, 
  Settings, 
  Eye, 
  Edit, 
  Copy, 
  Trash2,
  Share,
  Download,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";

interface FormsPageState {
  activeTab: 'overview' | 'builder' | 'templates' | 'responses';
  selectedForm?: FormTemplate;
  editingForm?: FormTemplate;
}

const mockForms: FormTemplate[] = [
  {
    id: "form_1",
    title: "Patient Intake Form",
    description: "Comprehensive new patient registration",
    category: "intake",
    fields: [],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: true,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true,
      submitMessage: "Thank you for your submission!"
    },
    styling: {
      theme: "medical",
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    status: "published",
    responses: 45
  },
  {
    id: "form_2",
    title: "Mental Health Screening",
    description: "PHQ-9 and GAD-7 assessment tool",
    category: "assessment",
    fields: [],
    settings: {
      allowAnonymous: true,
      requireAuthentication: false,
      multiPage: false,
      showProgress: true,
      autoSave: true,
      notifications: false,
      branding: true,
      submitMessage: "Assessment completed successfully!"
    },
    styling: {
      theme: "minimal",
      primaryColor: "#10b981",
      backgroundColor: "#f8fafc",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-14T00:00:00Z",
    status: "draft",
    responses: 0
  }
];

export default function FormsPage() {
  const [state, setState] = useState<FormsPageState>({
    activeTab: 'overview'
  });
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleCreateNew = () => {
    setState(prev => ({
      ...prev,
      activeTab: 'builder',
      editingForm: undefined
    }));
  };

  const handleEditForm = (form: FormTemplate) => {
    setState(prev => ({
      ...prev,
      activeTab: 'builder',
      editingForm: form
    }));
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setState(prev => ({
      ...prev,
      activeTab: 'builder',
      editingForm: template
    }));
  };

  const handleSaveForm = (form: FormTemplate) => {
    // Save form logic would go here
    setState(prev => ({
      ...prev,
      activeTab: 'overview'
    }));
  };

  const handleDuplicateForm = (form: FormTemplate) => {
    // Duplicate form logic would go here
    console.log("Duplicating form:", form.title);
  };

  const handleShareForm = (form: FormTemplate) => {
    // Share form logic would go here
    console.log("Sharing form:", form.title);
  };

  const handlePreviewForm = (form: FormTemplate) => {
    // Preview form logic would go here
    console.log("Previewing form:", form.title);
  };

  const getStatusColor = (form: FormTemplate) => {
    return form.status === 'published' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Advanced Form Builder" subtitle="Create comprehensive forms with drag-and-drop interface" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Form Builder</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create comprehensive forms with drag-and-drop interface, conditional logic, and advanced field types
              </p>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Form
            </Button>
          </div>
        </div>

        <Tabs value={state.activeTab} onValueChange={(value) => setState(prev => ({ ...prev, activeTab: value as any }))}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="builder">Drag & Drop Builder</TabsTrigger>
            <TabsTrigger value="templates">Form Templates</TabsTrigger>
            <TabsTrigger value="responses">Analytics & Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            <AdvancedFormBuilder 
              form={state.editingForm}
              onSave={handleSaveForm}
              onCancel={() => setState(prev => ({ ...prev, activeTab: 'overview' }))}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockForms.length}</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <p className="text-xs text-muted-foreground">
                    +15% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">
                    +3% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockForms.filter(f => f.status === 'published').length}</div>
                  <p className="text-xs text-muted-foreground">
                    Forms currently published
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockForms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{form.title}</h3>
                          <Badge className={getStatusColor(form)}>
                            {form.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{form.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Updated {format(new Date(form.updatedAt), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {form.responses || 0} responses
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePreviewForm(form)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditForm(form)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicateForm(form)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShareForm(form)}>
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Templates</CardTitle>
                <p className="text-gray-600 dark:text-gray-400">Choose from pre-built form templates or create your own</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { name: "Patient Intake", description: "Comprehensive new patient registration form", icon: Users },
                    { name: "Mental Health", description: "PHQ-9 and GAD-7 assessment screening", icon: FileText },
                    { name: "Satisfaction Survey", description: "Patient feedback and satisfaction survey", icon: BarChart3 },
                    { name: "Insurance Verification", description: "Insurance information and verification", icon: Settings },
                    { name: "Consent Forms", description: "Treatment consent and HIPAA forms", icon: CheckCircle },
                    { name: "Appointment Feedback", description: "Post-appointment evaluation form", icon: Calendar }
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectTemplate(mockForms[0])}>
                      <CardContent className="p-6">
                        <template.icon className="h-8 w-8 text-blue-600 mb-4" />
                        <h3 className="font-semibold mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Analytics & Responses</CardTitle>
                <p className="text-gray-600 dark:text-gray-400">Track form performance and analyze response data</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Detailed response analytics, completion rates, and data visualization will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}