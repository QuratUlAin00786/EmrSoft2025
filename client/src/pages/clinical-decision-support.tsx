import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ClinicalInsight {
  id: string;
  patientId: string;
  patientName: string;
  type: 'diagnostic' | 'treatment' | 'drug_interaction' | 'risk_assessment' | 'preventive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  confidence: number;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  createdAt: string;
  status: 'active' | 'reviewed' | 'dismissed' | 'implemented';
  provider?: string;
  relatedConditions: string[];
  supportingData: {
    labValues?: Array<{ name: string; value: string; reference: string; status: 'normal' | 'abnormal' | 'critical' }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; interactions?: string[] }>;
    vitalSigns?: Array<{ parameter: string; value: string; trend: 'stable' | 'improving' | 'worsening' }>;
  };
}

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
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  // Fetch clinical insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/clinical/insights", filterPriority, filterType],
    enabled: true
  });

  // Fetch risk assessments
  const { data: riskAssessments, isLoading: riskLoading } = useQuery({
    queryKey: ["/api/clinical/risk-assessments"],
    enabled: true
  });

  // Generate new insight mutation
  const generateInsightMutation = useMutation({
    mutationFn: async (data: { patientId: string; symptoms: string; history: string }) => {
      const response = await fetch("/api/clinical/generate-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to generate insight");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/insights"] });
      toast({ title: "AI insight generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate insight", variant: "destructive" });
    }
  });

  // Update insight status mutation
  const updateInsightMutation = useMutation({
    mutationFn: async (data: { insightId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/clinical/insights/${data.insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status, notes: data.notes }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update insight");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical/insights"] });
      toast({ title: "Insight updated successfully" });
    }
  });

  const mockInsights: ClinicalInsight[] = [
    {
      id: "insight_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      type: "drug_interaction",
      priority: "high",
      title: "Potential Drug Interaction Alert",
      description: "Warfarin and Amoxicillin combination may increase bleeding risk",
      recommendations: [
        "Monitor INR more frequently (every 2-3 days)",
        "Consider alternative antibiotic if possible",
        "Educate patient on bleeding signs",
        "Document interaction in patient record"
      ],
      confidence: 92,
      evidenceLevel: "A",
      createdAt: "2024-06-26T14:30:00Z",
      status: "active",
      provider: "Dr. Emily Watson",
      relatedConditions: ["Atrial Fibrillation", "Upper Respiratory Infection"],
      supportingData: {
        medications: [
          { name: "Warfarin", dosage: "5mg", frequency: "Daily", interactions: ["Amoxicillin"] },
          { name: "Amoxicillin", dosage: "500mg", frequency: "TID", interactions: ["Warfarin"] }
        ]
      }
    },
    {
      id: "insight_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      type: "risk_assessment",
      priority: "medium",
      title: "Cardiovascular Risk Assessment",
      description: "Patient shows elevated 10-year cardiovascular risk based on current factors",
      recommendations: [
        "Initiate statin therapy",
        "Lifestyle counseling for diet and exercise",
        "Blood pressure monitoring",
        "Follow-up in 3 months"
      ],
      confidence: 87,
      evidenceLevel: "A",
      createdAt: "2024-06-26T13:15:00Z",
      status: "active",
      relatedConditions: ["Hypertension", "Hyperlipidemia"],
      supportingData: {
        labValues: [
          { name: "Total Cholesterol", value: "285 mg/dL", reference: "<200", status: "abnormal" },
          { name: "LDL", value: "185 mg/dL", reference: "<100", status: "abnormal" },
          { name: "HDL", value: "35 mg/dL", reference: ">40", status: "abnormal" }
        ],
        vitalSigns: [
          { parameter: "Blood Pressure", value: "145/92 mmHg", trend: "worsening" },
          { parameter: "BMI", value: "28.5", trend: "stable" }
        ]
      }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clinical Decision Support</h1>
          <p className="text-gray-600 mt-1">AI-powered insights and recommendations</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Brain className="w-4 h-4 mr-2" />
                Generate Insight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate AI Clinical Insight</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Patient</label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient_1">Sarah Johnson</SelectItem>
                      <SelectItem value="patient_2">Michael Chen</SelectItem>
                      <SelectItem value="patient_3">Emma Davis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Symptoms/Concerns</label>
                  <Textarea 
                    placeholder="Enter patient symptoms or clinical concerns"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Relevant History</label>
                  <Textarea 
                    placeholder="Enter relevant medical history"
                    className="mt-1"
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => generateInsightMutation.mutate({
                    patientId: selectedPatient,
                    symptoms: "Sample symptoms",
                    history: "Sample history"
                  })}
                  disabled={generateInsightMutation.isPending}
                >
                  {generateInsightMutation.isPending ? "Analyzing..." : "Generate Insight"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate and download clinical decision support report
              const reportData = {
                title: "Clinical Decision Support Report",
                generatedAt: new Date().toISOString(),
                activeInsights: mockInsights.filter(insight => insight.status === 'active').length,
                totalInsights: mockInsights.length,
                riskAssessments: mockRiskScores.length,
                criticalAlerts: mockInsights.filter(insight => insight.priority === 'critical').length,
                insights: mockInsights.map(insight => ({
                  patient: insight.patientName,
                  type: insight.type,
                  priority: insight.priority,
                  title: insight.title,
                  description: insight.description,
                  confidence: insight.confidence,
                  status: insight.status,
                  recommendations: insight.recommendations
                })),
                riskScores: mockRiskScores.map(risk => ({
                  category: risk.category,
                  score: risk.score,
                  risk: risk.risk,
                  factors: risk.factors,
                  recommendations: risk.recommendations
                }))
              };

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

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `clinical-decision-support-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              toast({
                title: "Report Downloaded",
                description: "Clinical decision support report has been downloaded successfully.",
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
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
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
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="drug_interaction">Drug Interaction</SelectItem>
                  <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {mockInsights.map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{insight.type.replace('_', ' ')}</Badge>
                        <span className="text-sm text-gray-500">
                          Evidence Level {insight.evidenceLevel}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold">{insight.title}</h3>
                      <p className="text-sm text-gray-600">
                        {insight.patientName} • {format(new Date(insight.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">Confidence</div>
                        <div className="text-2xl font-bold text-blue-600">{insight.confidence}%</div>
                      </div>
                      <Progress value={insight.confidence} className="w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{insight.description}</p>
                  
                  {insight.supportingData.medications && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Medications Involved</h4>
                      <div className="space-y-1">
                        {insight.supportingData.medications.map((med, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Pill className="w-4 h-4 text-blue-500" />
                            <span>{med.name} {med.dosage} {med.frequency}</span>
                            {med.interactions && med.interactions.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Interaction
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insight.supportingData.labValues && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Lab Values</h4>
                      <div className="space-y-1">
                        {insight.supportingData.labValues.map((lab, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{lab.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={lab.status === 'abnormal' ? 'text-red-600' : 'text-green-600'}>
                                {lab.value}
                              </span>
                              <span className="text-gray-500">({lab.reference})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm"
                      onClick={() => updateInsightMutation.mutate({ 
                        insightId: insight.id, 
                        status: "reviewed" 
                      })}
                    >
                      Mark Reviewed
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateInsightMutation.mutate({ 
                        insightId: insight.id, 
                        status: "implemented" 
                      })}
                    >
                      Mark Implemented
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => updateInsightMutation.mutate({ 
                        insightId: insight.id, 
                        status: "dismissed" 
                      })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockRiskScores.map((risk, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{risk.category}</span>
                    <Badge className={getPriorityColor(risk.risk)}>
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
                      <div className="text-sm text-gray-500">Risk Score</div>
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
                <p className="text-gray-600 mb-4">
                  Access the latest clinical guidelines and evidence-based recommendations.
                </p>
                <Button>
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Guidelines
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}