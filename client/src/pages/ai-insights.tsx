import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { Lightbulb, CheckCircle, AlertTriangle, Sparkles, Clock, CheckCheck, X } from "lucide-react";
import type { AiInsight } from "@/types";

const insightIcons = {
  risk_alert: Lightbulb,
  treatment_suggestion: CheckCircle,
  drug_interaction: AlertTriangle,
  preventive_care: CheckCircle
};

const insightColors = {
  risk_alert: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: "text-blue-500"
  },
  treatment_suggestion: {
    bg: "bg-green-50",
    border: "border-green-100",
    icon: "text-green-500"
  },
  drug_interaction: {
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    icon: "text-yellow-500"
  },
  preventive_care: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    icon: "text-purple-500"
  }
};

const severityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

export default function AiInsights() {
  const queryClient = useQueryClient();
  
  const { data: insights, isLoading, error } = useQuery<AiInsight[]>({
    queryKey: ["/api/dashboard/ai-insights"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/dashboard/ai-insights', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': 'demo'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }
      return response.json();
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const updateInsightMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/ai/insights/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] });
    }
  });

  if (isLoading) {
    return (
      <>
        <Header 
          title="AI Insights" 
          subtitle="AI-powered medical insights and recommendations."
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  // Only show error if there's a meaningful error and no data
  if (error && !isLoading && !insights) {
    console.error('AI Insights error:', error);
    return (
      <>
        <Header 
          title="AI Insights" 
          subtitle="AI-powered medical insights and recommendations."
        />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-neutral-600">
                Unable to load AI insights. Please try again later.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] })}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Data loaded successfully
  
  // Ensure insights is an array
  const safeInsights = Array.isArray(insights) ? insights : [];
  const activeInsights = safeInsights.filter(insight => insight.status === 'active');
  const dismissedInsights = safeInsights.filter(insight => insight.status === 'dismissed');
  const resolvedInsights = safeInsights.filter(insight => insight.status === 'resolved');

  return (
    <>
      <Header 
        title="AI Insights" 
        subtitle="AI-powered medical insights and recommendations."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Clock className="w-4 h-4" />
              <span>Real-time analysis</span>
            </div>
          </div>
        </div>

        {/* Active Insights */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Active Insights ({activeInsights.length})
            </h3>
            
            {activeInsights.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-neutral-600">No active insights at the moment.</p>
                  <p className="text-sm text-neutral-500 mt-2">
                    The AI is continuously monitoring for new insights.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeInsights.map((insight) => {
                  const IconComponent = insightIcons[insight.type] || Lightbulb;
                  const colors = insightColors[insight.type] || insightColors.risk_alert;
                  
                  return (
                    <Card key={insight.id} className={`${colors.bg} ${colors.border}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 ${colors.icon} bg-white rounded-full flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="secondary"
                                  className={severityColors[insight.severity]}
                                >
                                  {insight.severity.toUpperCase()}
                                </Badge>
                                {insight.actionRequired && (
                                  <Badge variant="destructive">Action Required</Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-gray-700 mb-3">{insight.description}</p>
                            
                            {insight.confidence && (
                              <p className="text-sm text-gray-600 mb-3">
                                Confidence: {Math.round(insight.confidence * 100)}%
                              </p>
                            )}

                            {insight.metadata.suggestedActions && insight.metadata.suggestedActions.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-800 mb-2">Suggested Actions:</h5>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {insight.metadata.suggestedActions.map((action, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-medical-blue">•</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex items-center space-x-4">
                              <Button
                                size="sm"
                                onClick={() => updateInsightMutation.mutate({ 
                                  id: insight.id, 
                                  status: 'resolved' 
                                })}
                                disabled={updateInsightMutation.isPending}
                                className="bg-medical-green hover:bg-green-600"
                              >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Mark Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateInsightMutation.mutate({ 
                                  id: insight.id, 
                                  status: 'dismissed' 
                                })}
                                disabled={updateInsightMutation.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                              {insight.patientId && (
                                <Button variant="link" size="sm">
                                  View Patient
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resolved Insights */}
          {resolvedInsights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recently Resolved ({resolvedInsights.length})
              </h3>
              <div className="grid gap-3">
                {resolvedInsights.slice(0, 3).map((insight) => (
                  <Card key={insight.id} className="bg-green-50 border-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{insight.title}</p>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Resolved
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
