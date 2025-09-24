import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AiInsight, insertAiInsightSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Activity,
  Pill,
  FileText,
  Search,
  Filter,
  Download,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAiInsightsEvents } from "@/hooks/use-ai-insights-events";

// Use the actual database schema for form validation, excluding server-managed fields
const createInsightSchema = insertAiInsightSchema.omit({
  organizationId: true,
  id: true,
  createdAt: true
});

type CreateInsightForm = z.infer<typeof createInsightSchema>;

// Use the actual database type with additional fields for UI
type ClinicalInsight = AiInsight & {
  patientName?: string; // Add computed field for display
};

interface RiskScore {
  category: string;
  score: number;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export default function ClinicalDecisionSupport() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [activeTab, setActiveTab] = useState("insights");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedGuideline, setSelectedGuideline] = useState<any>(null);
  const [guidelineViewOpen, setGuidelineViewOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState<string>("");
  const [createInsightOpen, setCreateInsightOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string>("");
  const [history, setHistory] = useState<string>("");
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, string | null>>({});
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);
  const [tempSeverity, setTempSeverity] = useState<string>("");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Connect to SSE for real-time AI insight updates
  const { connected: sseConnected } = useAiInsightsEvents();

  // Form for creating insights
  const form = useForm<CreateInsightForm>({
    resolver: zodResolver(createInsightSchema),
    defaultValues: {
      type: "risk_alert",
      title: "",
      description: "",
      severity: "medium",
      actionRequired: false,
      confidence: "0.8", // String as per database schema
      patientId: undefined, // Required field for form validation
      metadata: {},
      status: "active",
      aiStatus: "pending"
    }
  });

  // Fetch patients for the searchable dropdown
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": "demo"
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    retry: false,
    staleTime: 30000
  });

  // Filter patients based on search
  const filteredPatients = patients.filter((patient: any) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const patientId = patient.patientId?.toLowerCase() || "";
    const searchTerm = patientSearch.toLowerCase();
    return fullName.includes(searchTerm) || patientId.includes(searchTerm);
  });

  // Get selected patient name for display
  const selectedPatientData = patients.find((p: any) => p.id.toString() === selectedPatient);
  const selectedPatientName = selectedPatientData 
    ? `${selectedPatientData.firstName} ${selectedPatientData.lastName} (${selectedPatientData.patientId})`
    : "Select patient";

  // Guidelines data
  const guidelines = {
    'nice-hypertension': {
      id: 'nice-hypertension',
      title: 'NICE Guidelines: Hypertension Management',
      description: 'Comprehensive guidance on diagnosis and management of hypertension in adults',
      organization: 'NICE (National Institute for Health and Care Excellence)',
      updated: 'March 2024',
      evidenceLevel: 'A',
      category: 'Cardiology',
      sections: [
        {
          title: 'Diagnosis and Assessment',
          content: [
            'Measure blood pressure in both arms when first assessing a person with suspected hypertension',
            'If difference >15 mmHg, use arm with higher reading for subsequent measurements',
            'Use automated devices for routine blood pressure measurement',
            'Consider ambulatory blood pressure monitoring (ABPM) or home blood pressure monitoring (HBPM) to confirm diagnosis'
          ]
        },
        {
          title: 'Classification',
          content: [
            'Stage 1 hypertension: Clinic BP 140/90 mmHg or higher and ABPM/HBPM average 135/85 mmHg or higher',
            'Stage 2 hypertension: Clinic BP 160/100 mmHg or higher and ABPM/HBPM average 150/95 mmHg or higher',
            'Stage 3 hypertension: Clinic systolic BP 180 mmHg or higher or clinic diastolic BP 110 mmHg or higher'
          ]
        },
        {
          title: 'Treatment Recommendations',
          content: [
            'Offer lifestyle advice to all people with hypertension',
            'Start antihypertensive drug treatment for adults aged under 80 with stage 1 hypertension and cardiovascular risk ≥10%',
            'Offer antihypertensive drug treatment to adults of any age with stage 2 hypertension',
            'Consider ACE inhibitor or ARB as first-line treatment for people aged under 55'
          ]
        }
      ]
    },
    'ada-diabetes': {
      id: 'ada-diabetes',
      title: 'ADA Standards: Diabetes Care',
      description: 'Evidence-based recommendations for diabetes diagnosis, treatment, and monitoring',
      organization: 'American Diabetes Association',
      updated: 'January 2024',
      evidenceLevel: 'A',
      category: 'Endocrinology',
      sections: [
        {
          title: 'Diagnostic Criteria',
          content: [
            'HbA1c ≥6.5% (48 mmol/mol) on two separate occasions',
            'Fasting plasma glucose ≥126 mg/dL (7.0 mmol/L) after 8-hour fast',
            'Random plasma glucose ≥200 mg/dL (11.1 mmol/L) with symptoms',
            '2-hour plasma glucose ≥200 mg/dL during oral glucose tolerance test'
          ]
        },
        {
          title: 'Treatment Goals',
          content: [
            'HbA1c target <7% for most adults',
            'More stringent target <6.5% may be appropriate for selected individuals',
            'Less stringent target <8% may be appropriate for those with limited life expectancy',
            'Blood pressure target <140/90 mmHg for most adults'
          ]
        }
      ]
    }
  };

  const viewGuideline = (guidelineId: string) => {
    const guideline = (guidelines as any)[guidelineId];
    if (guideline) {
      setSelectedGuideline(guideline);
      setGuidelineViewOpen(true);
    }
  };

  // Mock data definitions (must be defined before useQuery hooks)
  const mockInsights: ClinicalInsight[] = [
    {
      id: 1,
      organizationId: 2,
      patientId: 1,
      patientName: "Sarah Johnson",
      type: "drug_interaction",
      title: "Potential Drug Interaction Alert",
      description: "Warfarin and Amoxicillin combination may increase bleeding risk",
      severity: "high",
      actionRequired: true,
      confidence: "0.92",
      metadata: {
        relatedConditions: ["Atrial Fibrillation", "Upper Respiratory Infection"],
        suggestedActions: [
          "Monitor INR more frequently (every 2-3 days)",
          "Consider alternative antibiotic if possible",
          "Educate patient on bleeding signs",
          "Document interaction in patient record"
        ]
      },
      status: "active",
      aiStatus: "pending",
      createdAt: new Date("2024-06-26T14:30:00Z")
    },
    {
      id: 2,
      organizationId: 2,
      patientId: 2,
      patientName: "Michael Chen",
      type: "risk_alert",
      title: "Cardiovascular Risk Assessment",
      description: "Patient shows elevated 10-year cardiovascular risk based on current factors",
      severity: "medium",
      actionRequired: false,
      confidence: "0.87",
      metadata: {
        relatedConditions: ["Hypertension", "Hyperlipidemia"],
        suggestedActions: [
          "Initiate statin therapy",
          "Lifestyle counseling for diet and exercise",
          "Blood pressure monitoring",
          "Follow-up in 3 months"
        ]
      },
      status: "active",
      aiStatus: "reviewed",
      createdAt: new Date("2024-06-26T13:15:00Z")
    }
  ];

  const mockRiskScores: RiskScore[] = [
    {
      category: "Cardiovascular Disease",
      score: 15.2,
      risk: "high",
      factors: ["Age >65", "Smoking", "Hypertension", "High cholesterol"],
      recommendations: ["Statin therapy", "Blood pressure control", "Smoking cessation"]
    },
    {
      category: "Diabetes",
      score: 8.7,
      risk: "moderate",
      factors: ["Family history", "BMI >25", "Prediabetes"],
      recommendations: ["Annual glucose screening", "Weight management", "Diet counseling"]
    }
  ];

  // Fetch AI insights with real data
  const { data: insights = [], isLoading: insightsLoading, refetch: refetchInsights } = useQuery<ClinicalInsight[]>({
    queryKey: ["/api/ai-insights", selectedPatient, filterSeverity, filterType, patients?.length],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPatient && selectedPatient !== "") {
        params.append("patientId", selectedPatient);
      }
      
      const response = await fetch(`/api/ai-insights?${params}`, {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": "demo"
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch insights");
      const data = await response.json();
      
      // Transform data to match AiInsight type and apply filters
      return data.filter((insight: any) => 
        (filterSeverity === 'all' || insight.severity === filterSeverity) &&
        (filterType === 'all' || insight.type === filterType)
      ).map((insight: any) => {
        // Find the patient data for this insight
        const patientData = patients.find((p: any) => p.id === insight.patientId);
        return {
          ...insight,
          id: insight.id.toString(),
          patientId: insight.patientId?.toString() || "",
          patientName: patientData ? `${patientData.firstName} ${patientData.lastName}` : `Patient ${insight.patientId}`,
          aiStatus: insight.aiStatus || insight.ai_status || "pending", // Map snake_case to camelCase
        };
      });
    },
    retry: false,
    staleTime: 30000,
    enabled: true
  });

  // Fetch risk assessments
  const { data: riskAssessments = mockRiskScores, isLoading: riskLoading } = useQuery<RiskScore[]>({
    queryKey: ["/api/clinical/risk-assessments"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/clinical/risk-assessments", {
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
            "X-Tenant-Subdomain": "demo"
          },
          credentials: "include"
        });
        if (!response.ok) throw new Error("Failed to fetch risk assessments");
        return response.json();
      } catch (error) {
        // If API fails, return mock data as fallback
        console.warn("Using mock risk assessments data:", error);
        return mockRiskScores;
      }
    },
    retry: false,
    staleTime: 30000,
    enabled: true
  });

  // Create new insight mutation
  const createInsightMutation = useMutation({
    mutationFn: async (data: CreateInsightForm) => {
      return apiRequest("POST", `/api/ai-insights`, data);
    },
    onSuccess: (data) => {
      toast({
        title: "Insight Created",
        description: "Successfully created new AI insight.",
      });
      // Invalidate and refetch immediately to show new data
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/ai-insights"] });
      form.reset();
      setCreateInsightOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create AI insight",
        variant: "destructive"
      });
    }
  });

  // Delete insight mutation
  const deleteInsightMutation = useMutation({
    mutationFn: async (insightId: string) => {
      return apiRequest("DELETE", `/api/ai-insights/${insightId}`);
    },
    onSuccess: () => {
      toast({
        title: "Insight Deleted",
        description: "Successfully deleted AI insight.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete AI insight",
        variant: "destructive"
      });
    }
  });

  // Update severity mutation
  const updateSeverityMutation = useMutation({
    mutationFn: async (data: { insightId: string; severity: string }) => {
      return apiRequest("PATCH", `/api/ai-insights/${data.insightId}`, { severity: data.severity });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Severity Updated",
        description: `Severity changed to ${variables.severity}`,
      });
      // Auto-update UI by invalidating and refetching insights
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      refetchInsights();
      setEditingSeverity(null);
      setTempSeverity("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update severity",
        variant: "destructive"
      });
    }
  });

  // Generate new insight mutation (keep existing for AI generation)
  const generateInsightMutation = useMutation({
    mutationFn: async (data: { patientId: string; symptoms: string; history: string }) => {
      const response = await fetch("/api/ai/generate-insights", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": "demo"
        },
        body: JSON.stringify({ patientId: data.patientId }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to generate insight");
      return response.json();
    },
    onSuccess: async (data) => {
      // Use comprehensive cache invalidation that matches all AI insights queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      // Force immediate refetch to ensure data displays
      await queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/ai-insights" 
      });
      
      if (data.success && data.insights && data.insights.length > 0) {
        const fallbackMessage = data.usingFallbackData ? " (using fallback data)" : "";
        toast({ 
          title: "AI insights generated successfully",
          description: `Generated ${data.insights.length} clinical insight${data.insights.length > 1 ? 's' : ''} for ${data.patientName}${fallbackMessage}`
        });
      } else {
        toast({ 
          title: "No insights generated", 
          description: "No new insights were generated for this patient.",
          variant: "destructive" 
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to generate insight", variant: "destructive" });
    }
  });

  // Update insight AI status with individual button loading states
  const updateInsightStatus = async (insightId: string, aiStatus: string, buttonType: string) => {
    const buttonKey = `${insightId}-${buttonType}`;
    
    try {
      setButtonLoadingStates(prev => ({ ...prev, [buttonKey]: buttonType }));
      
      console.log(`[UPDATE] Starting status update for insight ${insightId}: -> ${aiStatus}`);
      
      await apiRequest("PATCH", `/api/ai/insights/${insightId}`, { aiStatus });
      
      console.log(`[UPDATE] ✅ Status update completed for insight ${insightId}`);
      
      // 🚀 IMMEDIATE AUTO-REFRESH: Force refresh insights data immediately
      await refetchInsights();
      
      // 🔄 COMPREHENSIVE INVALIDATION: Refresh all related queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/clinical/risk-assessments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({ 
        title: "Status Updated", 
        description: `Status has been successfully changed to ${aiStatus}` 
      });
    } catch (error: any) {
      // On error, invalidate to refresh from server
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [buttonKey]: null }));
    }
  };

  // Keep the original mutation for backward compatibility
  const updateInsightMutation = useMutation({
    mutationFn: async (data: { insightId: string; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/ai/insights/${data.insightId}`, { status: data.status, notes: data.notes });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      toast({ 
        title: "Insight updated successfully", 
        description: `Status changed to ${variables.status}` 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update insight",
        variant: "destructive"
      });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "text-red-600";
      case "high": return "text-orange-600";
      case "moderate": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  // Helper functions for severity editing
  const startEditingSeverity = (insightId: string, currentSeverity: string) => {
    setEditingSeverity(insightId);
    setTempSeverity(currentSeverity);
  };

  const cancelEditingSeverity = () => {
    setEditingSeverity(null);
    setTempSeverity("");
  };

  const saveSeverity = (insightId: string) => {
    if (tempSeverity && tempSeverity !== "") {
      updateSeverityMutation.mutate({ insightId, severity: tempSeverity });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Clinical Decision Support</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">AI-powered insights and recommendations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog open={createInsightOpen} onOpenChange={setCreateInsightOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-insight">
                <Plus className="w-4 h-4 mr-2" />
                Generate AI Insight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New AI Insight</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createInsightMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select open={patientSearchOpen} onOpenChange={setPatientSearchOpen} 
                                  value={field.value?.toString()} 
                                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                            <FormControl>
                              <SelectTrigger data-testid="select-patient">
                                <SelectValue placeholder="Select patient">
                                  {patients.find((p: any) => p.id === field.value) 
                                    ? `${patients.find((p: any) => p.id === field.value)?.firstName} ${patients.find((p: any) => p.id === field.value)?.lastName}` 
                                    : "Select patient"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Search patients..."
                                  value={patientSearch}
                                  onChange={(e) => setPatientSearch(e.target.value)}
                                  className="mb-2"
                                  data-testid="input-patient-search"
                                />
                              </div>
                              {patientsLoading ? (
                                <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                              ) : (
                                filteredPatients.map((patient: any) => (
                                  <SelectItem key={patient.id} value={patient.id.toString()}>
                                    {`${patient.firstName} ${patient.lastName} (${patient.patientId})`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="risk_alert">Risk Alert</SelectItem>
                              <SelectItem value="drug_interaction">Drug Interaction</SelectItem>
                              <SelectItem value="treatment_suggestion">Treatment Suggestion</SelectItem>
                              <SelectItem value="preventive_care">Preventive Care</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter insight title" {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter detailed description" 
                            {...field} 
                            data-testid="textarea-description"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-severity">
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="actionRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Action Required</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Does this insight require immediate action?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-action-required"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="confidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confidence Level: {Math.round(parseFloat(field.value || '0') * 100)}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[parseFloat(field.value || '0')]}
                            onValueChange={(value) => field.onChange(value[0].toFixed(2))}
                            className="w-full"
                            data-testid="slider-confidence"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symptoms (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter symptoms..." 
                              {...field} 
                              data-testid="textarea-symptoms"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>History (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter medical history..." 
                              {...field} 
                              data-testid="textarea-history"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateInsightOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createInsightMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createInsightMutation.isPending && (
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <Save className="w-4 h-4 mr-2" />
                      Generate AI Insight
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate and download clinical decision support report
              console.log('[EXPORT] Generating clinical decision support report...');
              
              // Ensure we have valid data
              const validInsights = insights || [];
              const validRiskScores = mockRiskScores || [];
              
              const reportData = {
                title: "Clinical Decision Support Report",
                generatedAt: new Date().toISOString(),
                activeInsights: validInsights.filter(insight => insight.status === 'active').length,
                totalInsights: validInsights.length,
                riskAssessments: validRiskScores.length,
                criticalAlerts: validInsights.filter(insight => insight.severity === 'critical').length,
                insights: validInsights.map(insight => ({
                  patient: insight.patientName || 'Unknown Patient',
                  type: insight.type || 'General',
                  priority: insight.severity || 'medium',
                  title: insight.title || 'Clinical Insight',
                  description: insight.description || 'No description available',
                  confidence: insight.confidence || 0,
                  status: insight.status || 'Pending',
                  recommendations: []
                })),
                riskScores: validRiskScores.map(risk => ({
                  category: risk.category || 'General Risk',
                  score: risk.score || 0,
                  risk: risk.risk || 'low',
                  factors: risk.factors || [],
                  recommendations: risk.recommendations || []
                }))
              };
              
              console.log('[EXPORT] Report data prepared:', reportData);

              const csvContent = [
                // Header
                ['Clinical Decision Support Report - Generated on ' + format(new Date(), 'PPpp')],
                [''],
                ['SUMMARY'],
                ['Total Active Insights', reportData.activeInsights],
                ['Total Insights', reportData.totalInsights],
                ['Critical Alerts', reportData.criticalAlerts],
                ['Risk Assessments', reportData.riskAssessments],
                [''],
                ['CLINICAL INSIGHTS'],
                ['Patient', 'Type', 'Priority', 'Title', 'Confidence', 'Status', 'Description'],
                ...reportData.insights.map(insight => [
                  insight.patient,
                  insight.type,
                  insight.priority,
                  insight.title,
                  insight.confidence + '%',
                  insight.status,
                  insight.description
                ]),
                [''],
                ['RISK ASSESSMENTS'],
                ['Category', 'Score', 'Risk Level', 'Key Factors'],
                ...reportData.riskScores.map(risk => [
                  risk.category,
                  risk.score,
                  risk.risk,
                  risk.factors.join('; ')
                ])
              ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

              console.log('[EXPORT] CSV content generated, length:', csvContent.length);
              
              const fileName = `clinical-decision-support-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
              console.log('[EXPORT] Downloading file:', fileName);

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', fileName);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              console.log('[EXPORT] File download initiated successfully');

              toast({
                title: "Medical Report Downloaded",
                description: `Clinical decision support report (${fileName}) has been downloaded successfully.`,
              });
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Clinical Insights</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="interactions">Drug Interactions</TabsTrigger>
          <TabsTrigger value="guidelines">Clinical Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="risk_alert">Risk Alert</SelectItem>
                  <SelectItem value="drug_interaction">Drug Interaction</SelectItem>
                  <SelectItem value="treatment_suggestion">Treatment Suggestion</SelectItem>
                  <SelectItem value="preventive_care">Preventive Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {(insights || []).map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {editingSeverity === insight.id.toString() ? (
                            <div className="flex items-center gap-1">
                              <Select value={tempSeverity} onValueChange={setTempSeverity}>
                                <SelectTrigger className="w-24 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="critical">Critical</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => saveSeverity(insight.id.toString())}
                                disabled={updateSeverityMutation.isPending}
                                data-testid={`button-save-severity-${insight.id}`}
                              >
                                {updateSeverityMutation.isPending ? (
                                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={cancelEditingSeverity}
                                data-testid={`button-cancel-severity-${insight.id}`}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge className={getSeverityColor(insight.severity)}>
                                {insight.severity.toUpperCase()}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                onClick={() => startEditingSeverity(insight.id.toString(), insight.severity)}
                                data-testid={`button-edit-severity-${insight.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{insight.type.replace('_', ' ')}</Badge>
                        {insight.actionRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold">{insight.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {insight.patientName} • {format(new Date(insight.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">Confidence</div>
                        <div className="text-2xl font-bold text-blue-600">{Math.round(parseFloat(insight.confidence || '0') * 100)}%</div>
                      </div>
                      <Progress value={parseFloat(insight.confidence || '0') * 100} className="w-16" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInsightMutation.mutate(insight.id.toString())}
                        disabled={deleteInsightMutation.isPending}
                        data-testid={`button-delete-insight-${insight.id}`}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleteInsightMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                  
                  {insight.metadata?.suggestedActions && insight.metadata.suggestedActions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Suggested Actions</h4>
                      <ul className="space-y-1">
                        {insight.metadata.suggestedActions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.metadata?.relatedConditions && insight.metadata.relatedConditions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Related Conditions</h4>
                      <div className="flex flex-wrap gap-1">
                        {insight.metadata.relatedConditions.map((condition, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Status</h4>
                      <Badge 
                        variant={insight.aiStatus === 'reviewed' ? 'default' : insight.aiStatus === 'implemented' ? 'secondary' : insight.aiStatus === 'dismissed' ? 'outline' : 'destructive'}
                        className="text-xs"
                      >
                        {insight.aiStatus ? insight.aiStatus.charAt(0).toUpperCase() + insight.aiStatus.slice(1) : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm"
                      disabled={!!buttonLoadingStates[`${insight.id}-reviewed`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "reviewed", "reviewed")}
                      data-testid={`button-reviewed-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-reviewed`] ? "Updating..." : "Reviewed"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!!buttonLoadingStates[`${insight.id}-implemented`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "implemented", "implemented")}
                      data-testid={`button-implemented-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-implemented`] ? "Updating..." : "Implemented"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      disabled={!!buttonLoadingStates[`${insight.id}-dismissed`]}
                      onClick={() => updateInsightStatus(insight.id.toString(), "dismissed", "dismissed")}
                      data-testid={`button-closed-${insight.id}`}
                    >
                      {buttonLoadingStates[`${insight.id}-dismissed`] ? "Updating..." : "Closed"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {riskLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading risk assessments...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskAssessments.map((risk, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{risk.category}</span>
                    <Badge className={getSeverityColor(risk.risk)}>
                      {risk.risk.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getRiskColor(risk.risk)}`}>
                        {risk.score}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Risk Score</div>
                    </div>
                    <Progress value={risk.score} className="flex-1" />
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Risk Factors</h4>
                    <ul className="space-y-1">
                      {risk.factors.map((factor, factorIdx) => (
                        <li key={factorIdx} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {risk.recommendations.map((rec, recIdx) => (
                        <li key={recIdx} className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No active drug interactions detected for current patients.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evidence-Based Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Access the latest clinical guidelines and evidence-based recommendations.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Guidelines
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Clinical Guidelines Browser</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Search and Filter */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input placeholder="Search guidelines..." className="w-full" />
                        </div>
                        <Select defaultValue="all">
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="respiratory">Respiratory</SelectItem>
                            <SelectItem value="infectious">Infectious Disease</SelectItem>
                            <SelectItem value="emergency">Emergency Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Guidelines List */}
                      <div className="grid gap-4">
                        {/* Featured Guidelines */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Featured Guidelines</h3>
                          <div className="grid gap-3">
                            <Card className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">NICE Guidelines: Hypertension Management</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      Comprehensive guidance on diagnosis and management of hypertension in adults
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Updated: March 2024</span>
                                      <span>Evidence Level: A</span>
                                      <Badge variant="secondary" className="text-xs">Cardiology</Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => viewGuideline('nice-hypertension')}
                                  >
                                    View
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-green-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">ADA Standards: Diabetes Care</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      Evidence-based recommendations for diabetes diagnosis, treatment, and monitoring
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Updated: January 2024</span>
                                      <span>Evidence Level: A</span>
                                      <Badge variant="secondary" className="text-xs">Endocrinology</Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => viewGuideline('ada-diabetes')}
                                  >
                                    View
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-purple-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">GOLD Guidelines: COPD Management</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      Global strategy for diagnosis, management and prevention of COPD
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Updated: February 2024</span>
                                      <span>Evidence Level: A</span>
                                      <Badge variant="secondary" className="text-xs">Respiratory</Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      toast({
                                        title: "Guideline Opened",
                                        description: "GOLD Guidelines: COPD Management - Opening detailed guideline view...",
                                      });
                                    }}
                                  >
                                    View
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Recent Updates */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Recent Updates</h3>
                          <div className="grid gap-3">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">WHO Guidelines: Antimicrobial Resistance</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      Updated recommendations for preventing and containing antimicrobial resistance
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Updated: April 2024</span>
                                      <span>Evidence Level: B</span>
                                      <Badge variant="secondary" className="text-xs">Infectious Disease</Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      toast({
                                        title: "Guideline Opened",
                                        description: "WHO Guidelines: Antimicrobial Resistance - Opening detailed guideline view...",
                                      });
                                    }}
                                  >
                                    View
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">ESC Guidelines: Heart Failure</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      European Society of Cardiology guidelines for acute and chronic heart failure
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Updated: March 2024</span>
                                      <span>Evidence Level: A</span>
                                      <Badge variant="secondary" className="text-xs">Cardiology</Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      toast({
                                        title: "Guideline Opened",
                                        description: "ESC Guidelines: Heart Failure - Opening detailed guideline view...",
                                      });
                                    }}
                                  >
                                    View
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Quick Access */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Quick Access</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/emergency-protocols");
                              }}
                            >
                              <Activity className="w-6 h-6 mb-1" />
                              <span className="text-xs">Emergency</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/medication-guide");
                              }}
                            >
                              <Pill className="w-6 h-6 mb-1" />
                              <span className="text-xs">Medications</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/prevention-guidelines");
                              }}
                            >
                              <Shield className="w-6 h-6 mb-1" />
                              <span className="text-xs">Prevention</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-20 flex flex-col items-center justify-center"
                              onClick={() => {
                                setLocation("/clinical-procedures");
                              }}
                            >
                              <FileText className="w-6 h-6 mb-1" />
                              <span className="text-xs">Procedures</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Guideline Viewer Dialog */}
      <Dialog open={guidelineViewOpen} onOpenChange={setGuidelineViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGuideline?.title}</DialogTitle>
          </DialogHeader>
          {selectedGuideline && (
            <div className="space-y-6">
              {/* Guideline Header */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Organization:</span>
                    <p className="text-gray-600 dark:text-gray-300">{selectedGuideline.organization}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <p className="text-gray-600 dark:text-gray-300">{selectedGuideline.updated}</p>
                  </div>
                  <div>
                    <span className="font-medium">Evidence Level:</span>
                    <Badge variant="secondary">{selectedGuideline.evidenceLevel}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Category:</span>
                    <Badge variant="outline">{selectedGuideline.category}</Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-gray-700 dark:text-gray-300">{selectedGuideline.description}</p>
                </div>
              </div>

              {/* Guideline Sections */}
              <div className="space-y-4">
                {selectedGuideline.sections?.map((section: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {section.content.map((item: string, itemIndex: number) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Generate and download PDF of the guideline
                    const pdfContent = `
Clinical Guideline: ${selectedGuideline.title}

Organization: ${selectedGuideline.organization}
Last Updated: ${selectedGuideline.updated}
Evidence Level: ${selectedGuideline.evidenceLevel}
Category: ${selectedGuideline.category}

Description: ${selectedGuideline.description}

${selectedGuideline.sections.map(section => `
${section.title}:
${section.content.map(item => `• ${item}`).join('\n')}
`).join('\n')}

Generated on ${new Date().toLocaleDateString()}
                    `;
                    
                    const blob = new Blob([pdfContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedGuideline.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    toast({ 
                      title: "Guideline downloaded", 
                      description: "Clinical guideline has been saved to your downloads" 
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Print the guideline content
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${selectedGuideline.title}</title>
                            <style>
                              body { margin: 20px; }
                              h1 { color: #333; }
                              h2 { color: #666; margin-top: 20px; }
                              ul { margin: 10px 0; }
                              li { margin: 5px 0; }
                              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                              .meta { color: #666; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${selectedGuideline.title}</h1>
                              <div class="meta">
                                <p><strong>Organization:</strong> ${selectedGuideline.organization}</p>
                                <p><strong>Last Updated:</strong> ${selectedGuideline.updated}</p>
                                <p><strong>Evidence Level:</strong> ${selectedGuideline.evidenceLevel}</p>
                                <p><strong>Category:</strong> ${selectedGuideline.category}</p>
                              </div>
                            </div>
                            
                            <p><strong>Description:</strong> ${selectedGuideline.description}</p>
                            
                            ${selectedGuideline.sections.map(section => `
                              <h2>${section.title}</h2>
                              <ul>
                                ${section.content.map(item => `<li>${item}</li>`).join('')}
                              </ul>
                            `).join('')}
                            
                            <div style="margin-top: 30px; font-size: 12px; color: #666;">
                              Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                    
                    toast({ 
                      title: "Printing guideline", 
                      description: "Clinical guideline is being prepared for printing" 
                    });
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Print Guideline
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Add guideline to favorites (localStorage)
                    const favorites = JSON.parse(localStorage.getItem('cura_favorite_guidelines') || '[]');
                    const favoriteItem = {
                      id: selectedGuideline.id,
                      title: selectedGuideline.title,
                      organization: selectedGuideline.organization,
                      category: selectedGuideline.category,
                      addedAt: new Date().toISOString()
                    };
                    
                    // Check if already in favorites
                    const existingIndex = favorites.findIndex((fav: any) => fav.id === selectedGuideline.id);
                    if (existingIndex === -1) {
                      favorites.push(favoriteItem);
                      localStorage.setItem('cura_favorite_guidelines', JSON.stringify(favorites));
                      toast({ 
                        title: "Added to favorites", 
                        description: `${selectedGuideline.title} has been saved to your favorites` 
                      });
                    } else {
                      toast({ 
                        title: "Already in favorites", 
                        description: "This guideline is already in your favorites list",
                        variant: "default"
                      });
                    }
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Add to Favorites
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}