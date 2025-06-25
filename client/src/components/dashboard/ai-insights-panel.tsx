import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
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

export function AiInsightsPanel() {
  const queryClient = useQueryClient();
  
  const { data: insights, isLoading, error } = useQuery<AiInsight[]>({
    queryKey: ["/api/dashboard/ai-insights"],
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
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI Patient Insights
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI Patient Insights
            <Badge variant="secondary">Unavailable</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            Unable to load AI insights. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI Patient Insights
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            No AI insights available at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          AI Patient Insights
          <Badge className="ai-gradient text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.slice(0, 3).map((insight) => {
          const IconComponent = insightIcons[insight.type] || Lightbulb;
          const colors = insightColors[insight.type] || insightColors.risk_alert;
          
          return (
            <div
              key={insight.id}
              className={`ai-insight-card ${colors.bg} ${colors.border}`}
            >
              <div className={`w-8 h-8 ${colors.icon} bg-white rounded-full flex items-center justify-center flex-shrink-0`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.confidence && (
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round(insight.confidence * 100)}%
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-3">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-medical-blue hover:text-blue-700"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-gray-500 hover:text-gray-600"
                    onClick={() => updateInsightMutation.mutate({ 
                      id: insight.id, 
                      status: 'dismissed' 
                    })}
                    disabled={updateInsightMutation.isPending}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {insights.length > 3 && (
          <div className="text-center pt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = "/ai-insights";
              }}
            >
              View All Insights ({insights.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
