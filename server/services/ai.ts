import OpenAI from "openai";
import type { Patient, MedicalRecord } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface AiInsightData {
  type: "risk_alert" | "drug_interaction" | "treatment_suggestion" | "preventive_care";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  actionRequired: boolean;
  confidence: number;
  metadata: {
    relatedConditions?: string[];
    suggestedActions?: string[];
    references?: string[];
  };
}

export class AiService {
  async analyzePatientRisk(patient: Patient, medicalHistory: MedicalRecord[]): Promise<AiInsightData[]> {
    try {
      const patientData = {
        age: this.calculateAge(patient.dateOfBirth),
        medicalHistory: patient.medicalHistory,
        recentRecords: medicalHistory.slice(0, 5).map(record => ({
          type: record.type,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          date: record.createdAt
        }))
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical AI assistant specializing in risk assessment. Analyze patient data and provide insights in JSON format. Focus on identifying potential health risks, drug interactions, and preventive care recommendations. Always include confidence scores and actionable suggestions.`
          },
          {
            role: "user",
            content: `Analyze this patient data for health risks and provide recommendations: ${JSON.stringify(patientData)}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return this.formatAiInsights(result);
    } catch (error) {
      console.error("AI analysis error:", error);
      return [];
    }
  }

  async analyzePrescription(medications: Array<{ name: string; dosage: string; frequency?: string; duration?: string }>, patientData: { age: number; allergies: string[]; conditions: string[] }): Promise<{
    interactions: Array<{
      severity: 'minor' | 'moderate' | 'major' | 'critical';
      description: string;
      medications: string[];
      recommendation: string;
    }>;
    allergyWarnings: Array<{
      medication: string;
      allergen: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
    doseWarnings: Array<{
      medication: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
    contraindications: Array<{
      medication: string;
      condition: string;
      severity: 'moderate' | 'high' | 'critical';
      recommendation: string;
    }>;
    ageWarnings: Array<{
      medication: string;
      issue: string;
      recommendation: string;
    }>;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a clinical pharmacist AI specializing in medication safety analysis. Analyze prescribed medications for:

1. Drug-drug interactions (check each medication against every other medication)
2. Drug-allergy conflicts (cross-reference with patient allergies)
3. Dosing concerns (check for appropriate dosing based on age, weight, conditions)
4. Contraindications (medications that shouldn't be used with patient's conditions)
5. Age-related concerns (pediatric/geriatric considerations)

Provide comprehensive analysis in JSON format with this exact structure:
{
  "interactions": [
    {
      "severity": "minor|moderate|major|critical",
      "description": "detailed explanation",
      "medications": ["drug1", "drug2"],
      "recommendation": "specific action to take"
    }
  ],
  "allergyWarnings": [
    {
      "medication": "drug name",
      "allergen": "specific allergen",
      "severity": "low|medium|high",
      "recommendation": "specific action"
    }
  ],
  "doseWarnings": [
    {
      "medication": "drug name",
      "issue": "specific dosing concern",
      "severity": "low|medium|high",
      "recommendation": "dosing adjustment needed"
    }
  ],
  "contraindications": [
    {
      "medication": "drug name",
      "condition": "patient condition",
      "severity": "moderate|high|critical",
      "recommendation": "alternative or monitoring needed"
    }
  ],
  "ageWarnings": [
    {
      "medication": "drug name",
      "issue": "age-related concern",
      "recommendation": "monitoring or adjustment needed"
    }
  ]
}

Be thorough and specific in your analysis. Include real clinical knowledge about drug interactions, contraindications, and safety concerns.`
          },
          {
            role: "user",
            content: `Analyze these medications for a ${patientData.age}-year-old patient:

Medications: ${medications.map(med => `${med.name} ${med.dosage} ${med.frequency || ''} ${med.duration || ''}`).join('; ')}

Patient Allergies: ${patientData.allergies.join(', ') || 'None listed'}

Patient Conditions: ${patientData.conditions.join(', ') || 'None listed'}

Please provide a comprehensive safety analysis focusing on clinically significant interactions and contraindications.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Ensure the response has the expected structure
      return {
        interactions: result.interactions || [],
        allergyWarnings: result.allergyWarnings || [],
        doseWarnings: result.doseWarnings || [],
        contraindications: result.contraindications || [],
        ageWarnings: result.ageWarnings || []
      };
    } catch (error) {
      console.error("Prescription analysis error:", error);
      return {
        interactions: [],
        allergyWarnings: [],
        doseWarnings: [],
        contraindications: [],
        ageWarnings: []
      };
    }
  }

  async generateTreatmentSuggestions(symptoms: string[], patientHistory: any): Promise<AiInsightData[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a diagnostic AI assistant. Based on symptoms and patient history, suggest potential diagnoses and treatment approaches. Always emphasize the need for clinical evaluation and provide evidence-based recommendations in JSON format.`
          },
          {
            role: "user",
            content: `Patient presents with symptoms: ${symptoms.join(", ")}. Medical history: ${JSON.stringify(patientHistory)}. Provide diagnostic suggestions and treatment recommendations.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return this.formatAiInsights(result);
    } catch (error) {
      console.error("Treatment suggestion error:", error);
      return [];
    }
  }

  async analyzeLabResults(labData: any, normalRanges: any): Promise<AiInsightData[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a laboratory medicine AI specialist. Analyze lab results against normal ranges and identify clinically significant findings. Provide interpretations and follow-up recommendations in JSON format.`
          },
          {
            role: "user",
            content: `Lab results: ${JSON.stringify(labData)}. Normal ranges: ${JSON.stringify(normalRanges)}. Provide clinical interpretation and recommendations.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return this.formatAiInsights(result);
    } catch (error) {
      console.error("Lab analysis error:", error);
      return [];
    }
  }

  async generatePreventiveCareReminders(patient: Patient): Promise<AiInsightData[]> {
    try {
      const age = this.calculateAge(patient.dateOfBirth);
      const patientProfile = {
        age,
        gender: "not_specified", // Would need to add gender field to schema
        medicalHistory: patient.medicalHistory,
        riskLevel: patient.riskLevel
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a preventive medicine AI specialist. Based on patient age, medical history, and risk factors, recommend appropriate preventive care measures and screening schedules according to clinical guidelines. Provide recommendations in JSON format.`
          },
          {
            role: "user",
            content: `Generate preventive care recommendations for: ${JSON.stringify(patientProfile)}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return this.formatAiInsights(result);
    } catch (error) {
      console.error("Preventive care analysis error:", error);
      return [];
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private formatAiInsights(aiResponse: any): AiInsightData[] {
    const insights: AiInsightData[] = [];
    
    // Handle different response formats from OpenAI
    if (aiResponse.insights && Array.isArray(aiResponse.insights)) {
      for (const insight of aiResponse.insights) {
        insights.push({
          type: insight.type || "treatment_suggestion",
          title: insight.title || "AI Recommendation",
          description: insight.description || insight.summary || "No description provided",
          severity: insight.severity || "medium",
          actionRequired: insight.actionRequired || false,
          confidence: Math.min(Math.max(insight.confidence || 0.7, 0), 1),
          metadata: {
            relatedConditions: insight.relatedConditions || [],
            suggestedActions: insight.suggestedActions || insight.recommendations || [],
            references: insight.references || []
          }
        });
      }
    } else if (aiResponse.recommendations) {
      // Handle single recommendation format
      insights.push({
        type: "treatment_suggestion",
        title: aiResponse.title || "AI Recommendation",
        description: aiResponse.description || aiResponse.summary || "AI-generated recommendation",
        severity: aiResponse.severity || "medium",
        actionRequired: aiResponse.actionRequired || false,
        confidence: Math.min(Math.max(aiResponse.confidence || 0.7, 0), 1),
        metadata: {
          relatedConditions: aiResponse.relatedConditions || [],
          suggestedActions: Array.isArray(aiResponse.recommendations) ? aiResponse.recommendations : [aiResponse.recommendations],
          references: aiResponse.references || []
        }
      });
    }

    return insights;
  }
}

export const aiService = new AiService();
