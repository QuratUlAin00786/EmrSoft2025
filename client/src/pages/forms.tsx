import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { FormBuilder, FormTemplate } from "@/components/forms/form-builder";
import { FormResponses } from "@/components/forms/form-responses";
import { SurveyTemplates } from "@/components/forms/survey-templates";
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
  AlertTriangle
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
      branding: true
    },
    styling: {
      theme: "medical",
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    isActive: true
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
      branding: true
    },
    styling: {
      theme: "minimal",
      primaryColor: "#10b981",
      backgroundColor: "#f8fafc",
      fontFamily: "Inter"
    },
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-14T00:00:00Z",
    isActive: true
  }
];

export default function FormsPage() {
  const [state, setState] = useState<FormsPageState>({
    activeTab: 'overview'
  });

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
    console.log('Saving form:', form);
    setState(prev => ({
      ...prev,
      activeTab: 'overview'
    }));
  };

  const getStatusColor = (form: FormTemplate) => {
    if (!form.isActive) return "bg-gray-100 text-gray-800";
    return "bg-green-100 text-green-800";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      intake: "bg-blue-100 text-blue-800",
      assessment: "bg-red-100 text-red-800",
      survey: "bg-green-100 text-green-800",
      feedback: "bg-yellow-100 text-yellow-800",
      consent: "bg-purple-100 text-purple-800",
      medical: "bg-pink-100 text-pink-800",
      custom: "bg-gray-100 text-gray-800"
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  if (state.activeTab === 'builder') {
    return (
      <div className="h-screen flex flex-col">
        <Header 
          title={state.editingForm ? "Edit Form" : "Form Builder"} 
          subtitle="Create and customize forms, surveys, and questionnaires"
        />
        <div className="flex-1">
          <FormBuilder 
            onSave={handleSaveForm}
            editingTemplate={state.editingForm}
          />
        </div>
      </div>
    );
  }

  if (state.activeTab === 'templates') {
    return (
      <>
        <Header 
          title="Form Templates" 
          subtitle="Choose from our comprehensive library of medical forms"
        />
        <div className="flex-1 overflow-auto p-6">
          <SurveyTemplates 
            onSelectTemplate={handleSelectTemplate}
            onCreateNew={handleCreateNew}
          />
        </div>
      </>
    );
  }

  if (state.activeTab === 'responses') {
    return (
      <>
        <Header 
          title="Form Responses" 
          subtitle="View and analyze form submissions and patient data"
        />
        <div className="flex-1 overflow-auto p-6">
          <FormResponses formId={state.selectedForm?.id} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Forms & Surveys" 
        subtitle="Create, manage, and analyze custom forms and patient surveys"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Forms</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Responses Today</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">87.5%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                    <p className="text-2xl font-bold">5.2min</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create New Form
            </Button>
            <Button 
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, activeTab: 'templates' }))}
            >
              <FileText className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
            <Button 
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, activeTab: 'responses' }))}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Responses
            </Button>
          </div>

          {/* Forms List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Forms</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockForms.map((form) => (
                  <Card key={form.id} className="hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{form.title}</h4>
                            <Badge className={getCategoryColor(form.category)}>
                              {form.category}
                            </Badge>
                            <Badge className={getStatusColor(form)}>
                              {form.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{form.description}</p>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {form.fields.length} fields
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              234 responses
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Updated {format(new Date(form.updatedAt), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              85% completion
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {form.settings.multiPage && (
                              <Badge variant="outline" className="text-xs">Multi-page</Badge>
                            )}
                            {form.settings.allowAnonymous && (
                              <Badge variant="outline" className="text-xs">Anonymous</Badge>
                            )}
                            {form.settings.autoSave && (
                              <Badge variant="outline" className="text-xs">Auto-save</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setState(prev => ({ 
                              ...prev, 
                              activeTab: 'responses',
                              selectedForm: form 
                            }))}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditForm(form)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Share className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {mockForms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No forms created yet</h3>
                  <p className="text-gray-600 mb-4">
                    Get started by creating your first form or choosing from our templates
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={handleCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setState(prev => ({ ...prev, activeTab: 'templates' }))}
                    >
                      Browse Templates
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Form Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Patient Intake Form completed</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Mental Health Screening started</p>
                      <p className="text-xs text-gray-500">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Satisfaction Survey incomplete</p>
                      <p className="text-xs text-gray-500">12 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">COVID Screening completed</p>
                      <p className="text-xs text-gray-500">18 minutes ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Form Completion Rate</span>
                      <span className="font-medium">87.5%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '87.5%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Response Time</span>
                      <span className="font-medium">5.2 minutes</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>User Satisfaction</span>
                      <span className="font-medium">4.8/5.0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}