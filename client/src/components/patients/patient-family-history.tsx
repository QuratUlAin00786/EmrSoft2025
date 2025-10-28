import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Users,
  Heart,
  AlertTriangle,
  Edit,
  Trash2,
  Activity,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@/types";

interface PatientFamilyHistoryProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

interface FamilyCondition {
  id: string;
  relative: string;
  condition: string;
  ageOfOnset?: string;
  notes?: string;
  severity: "mild" | "moderate" | "severe";
}

interface SocialHistory {
  smoking: {
    status: "never" | "former" | "current";
    packsPerDay?: number;
    yearsSmoked?: number;
    quitDate?: string;
  };
  alcohol: {
    status: "never" | "occasional" | "moderate" | "heavy";
    drinksPerWeek?: number;
  };
  drugs: {
    status: "never" | "former" | "current";
    substances?: string[];
    notes?: string;
  };
  occupation: string;
  maritalStatus: "single" | "married" | "divorced" | "widowed" | "partner";
  education: string;
  exercise: {
    frequency: "none" | "occasional" | "regular" | "daily";
    type?: string;
    duration?: string;
  };
}

interface Immunization {
  id: string;
  vaccine: string;
  date: string;
  provider: string;
  lot?: string;
  site?: string;
  notes?: string;
}

const commonConditions = [
  "Heart Disease",
  "Diabetes",
  "Cancer",
  "Hypertension",
  "Stroke",
  "Depression",
  "Anxiety",
  "Asthma",
  "COPD",
  "Kidney Disease",
  "Liver Disease",
  "Arthritis",
  "Osteoporosis",
  "Alzheimer's",
  "Parkinson's",
  "Epilepsy",
  "Thyroid Disease",
];

const relatives = [
  "Mother",
  "Father",
  "Maternal Grandmother",
  "Maternal Grandfather",
  "Paternal Grandmother",
  "Paternal Grandfather",
  "Sister",
  "Brother",
  "Maternal Aunt",
  "Maternal Uncle",
  "Paternal Aunt",
  "Paternal Uncle",
  "Daughter",
  "Son",
  "Other",
];

const commonVaccines = [
  "COVID-19",
  "Influenza",
  "Tetanus",
  "Diphtheria",
  "Pertussis",
  "MMR (Measles, Mumps, Rubella)",
  "Polio",
  "Hepatitis A",
  "Hepatitis B",
  "Varicella (Chickenpox)",
  "Pneumococcal",
  "Meningococcal",
  "HPV",
  "Shingles",
  "Tdap",
  "IPV",
  "Rotavirus",
  "Hib",
  "BCG",
];

export default function PatientFamilyHistory({
  patient,
  onUpdate,
}: PatientFamilyHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("family");
  const [newCondition, setNewCondition] = useState<Partial<FamilyCondition>>({
    relative: "",
    condition: "",
    severity: "mild",
  });
  const [showImmunizationForm, setShowImmunizationForm] = useState(false);
  const [newImmunization, setNewImmunization] = useState<Partial<Immunization>>(
    {
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    },
  );
  const [newAllergy, setNewAllergy] = useState("");
  const [newChronicCondition, setNewChronicCondition] = useState("");
  const [editingCondition, setEditingCondition] =
    useState<FamilyCondition | null>(null);
  const [familyErrors, setFamilyErrors] = useState({
    relative: "",
    condition: "",
  });
  const [immunizationErrors, setImmunizationErrors] = useState({
    vaccine: "",
    date: "",
    provider: "",
  });
  const [allergyError, setAllergyError] = useState("");
  const [chronicConditionError, setChronicConditionError] = useState("");
  const [socialHistoryErrors, setSocialHistoryErrors] = useState({
    occupation: "",
    education: "",
  });
  const [allergiesConditionsError, setAllergiesConditionsError] = useState("");

  // Ensure Family History tab is selected when dialog opens
  useEffect(() => {
    if (isEditing) {
      setActiveTab("family");
    }
  }, [isEditing]);

  const updateMedicalHistoryMutation = useMutation({
    mutationFn: async (medicalHistory: any) => {
      console.log(
        "MUTATION - Sending medical history:",
        JSON.stringify(medicalHistory, null, 2),
      );
      console.log(
        "MUTATION - Family history being sent:",
        medicalHistory.familyHistory,
      );
      const response = await apiRequest(
        "PATCH",
        `/api/patients/${patient.id}/medical-history`,
        medicalHistory,
      );
      return response.json();
    },
    onSuccess: (updatedPatient) => {
      // Update the local patient state with the response from the API
      onUpdate(updatedPatient);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patient.id}`],
      });
      toast({
        title: "Medical history updated",
        description: "Patient medical information has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error updating medical history",
        description: "Failed to save medical information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Make familyHistory reactive to patient data changes
  const familyHistory = patient.medicalHistory?.familyHistory || {
    father: [],
    mother: [],
    siblings: [],
    grandparents: [],
  };

  const defaultSocialHistory: SocialHistory = {
    smoking: { status: "never" },
    alcohol: { status: "never" },
    drugs: { status: "never" },
    occupation: "",
    maritalStatus: "single",
    education: "",
    exercise: { frequency: "none" },
  };

  const [editedSocialHistory, setEditedSocialHistory] = useState<SocialHistory>(
    () => {
      const currentSocialHistory = patient.medicalHistory?.socialHistory;
      // Check if the social history has the correct structure
      if (
        currentSocialHistory &&
        typeof currentSocialHistory === "object" &&
        (currentSocialHistory as any).smoking &&
        typeof (currentSocialHistory as any).smoking === "object" &&
        "status" in (currentSocialHistory as any).smoking
      ) {
        return currentSocialHistory as unknown as SocialHistory;
      }
      return defaultSocialHistory;
    },
  );

  const saveSocialHistory = () => {
    setSocialHistoryErrors({ occupation: "", education: "" });

    const errors = {
      occupation: !editedSocialHistory.occupation.trim()
        ? "Please enter occupation"
        : "",
      education: !editedSocialHistory.education.trim()
        ? "Please enter education level"
        : "",
    };

    if (errors.occupation || errors.education) {
      setSocialHistoryErrors(errors);
      return;
    }

    try {
      updateMedicalHistoryMutation.mutate({
        allergies: patient.medicalHistory?.allergies || [],
        chronicConditions: patient.medicalHistory?.chronicConditions || [],
        medications: patient.medicalHistory?.medications || [],
        familyHistory: patient.medicalHistory?.familyHistory || {},
        socialHistory: editedSocialHistory as any,
        immunizations: patient.medicalHistory?.immunizations || [],
      });
      setSocialHistoryErrors({ occupation: "", education: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save social history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addAllergy = () => {
    setAllergyError("");
    
    if (!newAllergy.trim()) {
      setAllergyError("Please enter an allergy");
      return;
    }

    const currentAllergies = patient.medicalHistory?.allergies || [];
    const updatedAllergies = [...currentAllergies, newAllergy.trim()];

    updateMedicalHistoryMutation.mutate({
      allergies: updatedAllergies,
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        allergies: updatedAllergies,
      },
    });
    setNewAllergy("");
    setAllergyError("");
    setAllergiesConditionsError(""); // Clear overall error
  };

  const removeAllergy = (index: number) => {
    // Get combined allergies just like in display logic
    const medicalAllergies = patient.medicalHistory?.allergies || [];
    const flagAllergies = patient.flags
      ? patient.flags
          .filter((flag) => typeof flag === "string" && flag.includes(":"))
          .map((flag) => flag.split(":")[2])
          .filter((allergy) => allergy && allergy.trim().length > 0)
      : [];

    const allAllergies = [...medicalAllergies, ...flagAllergies];
    const allergyToRemove = allAllergies[index];

    // Only remove from medicalHistory.allergies if it exists there
    const updatedAllergies = medicalAllergies.filter(
      (allergy) => allergy !== allergyToRemove,
    );

    updateMedicalHistoryMutation.mutate({
      allergies: updatedAllergies,
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        allergies: updatedAllergies,
      },
    });
  };

  const addChronicCondition = () => {
    setChronicConditionError("");
    
    if (!newChronicCondition.trim()) {
      setChronicConditionError("Please enter a chronic condition");
      return;
    }

    const currentConditions = patient.medicalHistory?.chronicConditions || [];
    const updatedConditions = [
      ...currentConditions,
      newChronicCondition.trim(),
    ];

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: updatedConditions,
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        chronicConditions: updatedConditions,
      },
    });
    setNewChronicCondition("");
    setChronicConditionError("");
    setAllergiesConditionsError(""); // Clear overall error
  };

  const removeChronicCondition = (index: number) => {
    const currentConditions = patient.medicalHistory?.chronicConditions || [];
    const updatedConditions = currentConditions.filter((_, i) => i !== index);

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: updatedConditions,
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        chronicConditions: updatedConditions,
      },
    });
  };

  const immunizations = patient.medicalHistory?.immunizations || [];

  const handleSaveAllChanges = () => {
    // Reset error
    setAllergiesConditionsError("");

    // Get allergies
    const medicalAllergies = patient.medicalHistory?.allergies || [];
    const flagAllergies = patient.flags
      ? patient.flags
          .filter((flag) => typeof flag === "string" && flag.includes(":"))
          .map((flag) => flag.split(":")[2])
          .filter((allergy) => allergy && allergy.trim().length > 0)
      : [];
    const allAllergies = [...medicalAllergies, ...flagAllergies];

    // Get chronic conditions
    const chronicConditions = patient.medicalHistory?.chronicConditions || [];

    // Validate that at least one allergy or chronic condition exists
    if (allAllergies.length === 0 && chronicConditions.length === 0) {
      setAllergiesConditionsError(
        "Please add at least one allergy or chronic condition before saving"
      );
      setActiveTab("allergies"); // Switch to allergies tab to show error
      return;
    }

    // Save the complete medical history including all sections
    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: patient.medicalHistory?.immunizations || [],
    });
    setIsEditing(false);
  };

  const addFamilyCondition = () => {
    // Reset errors
    setFamilyErrors({ relative: "", condition: "" });

    // Validate fields
    const errors = {
      relative: !newCondition.relative ? "Please select a family member" : "",
      condition: !newCondition.condition
        ? "Please select a medical condition"
        : "",
    };

    if (errors.relative || errors.condition) {
      setFamilyErrors(errors);
      return;
    }

    // Build the condition string
    const conditionText = `${newCondition.condition}${newCondition.ageOfOnset ? ` (age ${newCondition.ageOfOnset})` : ""}${newCondition.notes ? ` - ${newCondition.notes}` : ""}`;

    // Get current family history and create a copy
    const currentHistory = patient.medicalHistory?.familyHistory || {
      father: [],
      mother: [],
      siblings: [],
      grandparents: [],
    };

    // Determine which relative category this belongs to
    let relativeCategory: "father" | "mother" | "siblings" | "grandparents" =
      "father";
    const relativeText = newCondition.relative.toLowerCase().trim();

    if (relativeText === "mother") {
      relativeCategory = "mother";
    } else if (relativeText === "father") {
      relativeCategory = "father";
    } else if (
      relativeText.includes("sibling") ||
      relativeText.includes("sister") ||
      relativeText.includes("brother")
    ) {
      relativeCategory = "siblings";
    } else if (
      relativeText.includes("grandparent") ||
      relativeText.includes("grandmother") ||
      relativeText.includes("grandfather")
    ) {
      relativeCategory = "grandparents";
    } else {
      relativeCategory = "father"; // default to father
    }

    // Create the updated family history object
    const updatedFamilyHistory = {
      father: [...(currentHistory.father || [])],
      mother: [...(currentHistory.mother || [])],
      siblings: [...(currentHistory.siblings || [])],
      grandparents: [...(currentHistory.grandparents || [])],
    };

    // Add the new condition to the appropriate category
    updatedFamilyHistory[relativeCategory].push(conditionText);

    // Create the complete updated medical history
    const newMedicalHistory = {
      allergies: patient.medicalHistory?.allergies || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: updatedFamilyHistory,
      immunizations: patient.medicalHistory?.immunizations || [],
      socialHistory: patient.medicalHistory?.socialHistory || {},
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
    };

    // Save to database using the updated data
    updateMedicalHistoryMutation.mutate(newMedicalHistory);

    // Update local state immediately for instant UI feedback
    onUpdate({
      ...patient,
      medicalHistory: newMedicalHistory,
    });

    // Reset form only after successful local update
    setNewCondition({ relative: "", condition: "", severity: "mild" });
    setFamilyErrors({ relative: "", condition: "" });
  };

  const addImmunization = () => {
    // Reset errors
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });

    // Validate fields
    const errors = {
      vaccine: !newImmunization.vaccine ? "Please select a vaccine" : "",
      date: !newImmunization.date ? "Please select a date" : "",
      provider: !newImmunization.provider ? "Please enter a provider" : "",
    };

    if (errors.vaccine || errors.date || errors.provider) {
      setImmunizationErrors(errors);
      return;
    }

    const immunization: Immunization = {
      id: Date.now().toString(),
      vaccine: newImmunization.vaccine!,
      date: newImmunization.date!,
      provider: newImmunization.provider!,
      lot: newImmunization.lot,
      site: newImmunization.site,
      notes: newImmunization.notes,
    };

    const updatedImmunizations = [...immunizations, immunization];

    updateMedicalHistoryMutation.mutate({
      allergies: patient.medicalHistory?.allergies || [],
      chronicConditions: patient.medicalHistory?.chronicConditions || [],
      medications: patient.medicalHistory?.medications || [],
      familyHistory: patient.medicalHistory?.familyHistory || {},
      socialHistory: patient.medicalHistory?.socialHistory || {},
      immunizations: updatedImmunizations,
    });

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        immunizations: updatedImmunizations,
      },
    });

    setNewImmunization({
      vaccine: "",
      date: "",
      provider: "",
      lot: "",
      site: "",
      notes: "",
    });
    setImmunizationErrors({ vaccine: "", date: "", provider: "" });
    setShowImmunizationForm(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-yellow-100 text-yellow-800";
      case "moderate":
        return "bg-orange-100 text-orange-800";
      case "severe":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Complete Patient History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {patient.firstName} {patient.lastName} • Patient ID:{" "}
              {patient.patientId}
            </p>
          </div>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Add History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete Medical History</DialogTitle>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="family">Family History</TabsTrigger>
                  <TabsTrigger value="social">Social History</TabsTrigger>
                  <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
                  <TabsTrigger value="allergies">
                    Allergies & Conditions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="family" className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      Add Family Medical Condition
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Family Member</Label>
                        <Select
                          value={newCondition.relative}
                          onValueChange={(value) =>
                            setNewCondition({
                              ...newCondition,
                              relative: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relative" />
                          </SelectTrigger>
                          <SelectContent>
                            {relatives.map((rel) => (
                              <SelectItem key={rel} value={rel}>
                                {rel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {familyErrors.relative && (
                          <p className="text-sm text-red-500 mt-1">
                            {familyErrors.relative}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Medical Condition</Label>
                        <Select
                          value={newCondition.condition}
                          onValueChange={(value) =>
                            setNewCondition({
                              ...newCondition,
                              condition: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {commonConditions.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {familyErrors.condition && (
                          <p className="text-sm text-red-500 mt-1">
                            {familyErrors.condition}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Age of Onset</Label>
                        <Input
                          placeholder="e.g., 45"
                          value={newCondition.ageOfOnset || ""}
                          onChange={(e) =>
                            setNewCondition({
                              ...newCondition,
                              ageOfOnset: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select
                          value={newCondition.severity}
                          onValueChange={(value: any) =>
                            setNewCondition({
                              ...newCondition,
                              severity: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={addFamilyCondition} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Additional Notes</Label>
                      <Input
                        placeholder="Additional details about the condition"
                        value={newCondition.notes || ""}
                        onChange={(e) =>
                          setNewCondition({
                            ...newCondition,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(familyHistory).map(
                      ([relationship, conditions]) => (
                        <div
                          key={relationship}
                          className="border rounded-lg p-4"
                        >
                          <h5 className="font-medium mb-2 capitalize flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            {relationship === "siblings"
                              ? "Siblings"
                              : relationship}
                          </h5>
                          {conditions.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No conditions reported
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {conditions.map((condition, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-sm"
                                >
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Smoking Status</Label>
                        <Select
                          value={editedSocialHistory.smoking.status}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              smoking: {
                                ...editedSocialHistory.smoking,
                                status: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never smoked</SelectItem>
                            <SelectItem value="former">
                              Former smoker
                            </SelectItem>
                            <SelectItem value="current">
                              Current smoker
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Alcohol Consumption</Label>
                        <Select
                          value={editedSocialHistory.alcohol.status}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              alcohol: {
                                ...editedSocialHistory.alcohol,
                                status: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="occasional">
                              Occasional
                            </SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Exercise Frequency</Label>
                        <Select
                          value={editedSocialHistory.exercise.frequency}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              exercise: {
                                ...editedSocialHistory.exercise,
                                frequency: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No exercise</SelectItem>
                            <SelectItem value="occasional">
                              Occasional
                            </SelectItem>
                            <SelectItem value="regular">
                              Regular (2-3x/week)
                            </SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Occupation</Label>
                        <Input
                          value={editedSocialHistory.occupation}
                          onChange={(e) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              occupation: e.target.value,
                            })
                          }
                          placeholder="Current or former occupation"
                        />
                        {socialHistoryErrors.occupation && (
                          <p className="text-sm text-red-500 mt-1">
                            {socialHistoryErrors.occupation}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Marital Status</Label>
                        <Select
                          value={editedSocialHistory.maritalStatus}
                          onValueChange={(value: any) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              maritalStatus: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Education Level</Label>
                        <Input
                          value={editedSocialHistory.education}
                          onChange={(e) =>
                            setEditedSocialHistory({
                              ...editedSocialHistory,
                              education: e.target.value,
                            })
                          }
                          placeholder="Highest education level"
                        />
                        {socialHistoryErrors.education && (
                          <p className="text-sm text-red-500 mt-1">
                            {socialHistoryErrors.education}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={saveSocialHistory} className="px-6">
                      <Save className="h-4 w-4 mr-2" />
                      Save Social History
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="immunizations" className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Immunization Record</h4>
                    <div className="space-y-3">
                      {immunizations.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No immunization records
                        </p>
                      ) : (
                        immunizations.map((immunization, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div>
                              <div className="font-medium">
                                {immunization.vaccine}
                              </div>
                              <div className="text-sm text-gray-500">
                                {immunization.date} - {immunization.provider}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => setShowImmunizationForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Immunization
                    </Button>

                    {showImmunizationForm && (
                      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <h5 className="font-medium mb-3">
                          New Immunization Record
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Vaccine</Label>
                            <Select
                              value={newImmunization.vaccine}
                              onValueChange={(value) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  vaccine: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select vaccine" />
                              </SelectTrigger>
                              <SelectContent>
                                {commonVaccines.map((vaccine) => (
                                  <SelectItem key={vaccine} value={vaccine}>
                                    {vaccine}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {immunizationErrors.vaccine && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.vaccine}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Date Administered</Label>
                            <Input
                              type="date"
                              value={newImmunization.date}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  date: e.target.value,
                                })
                              }
                            />
                            {immunizationErrors.date && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.date}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Healthcare Provider</Label>
                            <Input
                              placeholder="Provider name or clinic"
                              value={newImmunization.provider}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  provider: e.target.value,
                                })
                              }
                            />
                            {immunizationErrors.provider && (
                              <p className="text-sm text-red-500 mt-1">
                                {immunizationErrors.provider}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Lot Number (Optional)</Label>
                            <Input
                              placeholder="Vaccine lot number"
                              value={newImmunization.lot}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  lot: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Administration Site (Optional)</Label>
                            <Select
                              value={newImmunization.site}
                              onValueChange={(value) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  site: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select site" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left-arm">
                                  Left Arm
                                </SelectItem>
                                <SelectItem value="right-arm">
                                  Right Arm
                                </SelectItem>
                                <SelectItem value="left-thigh">
                                  Left Thigh
                                </SelectItem>
                                <SelectItem value="right-thigh">
                                  Right Thigh
                                </SelectItem>
                                <SelectItem value="oral">Oral</SelectItem>
                                <SelectItem value="nasal">Nasal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                              placeholder="Additional notes or reactions"
                              value={newImmunization.notes}
                              onChange={(e) =>
                                setNewImmunization({
                                  ...newImmunization,
                                  notes: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={addImmunization} size="sm">
                            Add Record
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowImmunizationForm(false);
                              setNewImmunization({
                                vaccine: "",
                                date: "",
                                provider: "",
                                lot: "",
                                site: "",
                                notes: "",
                              });
                              setImmunizationErrors({
                                vaccine: "",
                                date: "",
                                provider: "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="allergies" className="space-y-4">
                  {allergiesConditionsError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 font-medium">
                        {allergiesConditionsError}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Known Allergies
                      </h4>
                      <div className="space-y-2 mb-4">
                        {(() => {
                          // Combine allergies from medicalHistory and extract from flags
                          const medicalAllergies =
                            patient.medicalHistory?.allergies || [];
                          const flagAllergies = patient.flags
                            ? patient.flags
                                .filter(
                                  (flag) =>
                                    typeof flag === "string" &&
                                    flag.includes(":"),
                                )
                                .map((flag) => flag.split(":")[2]) // Extract the allergy text after "general:medium:"
                                .filter(
                                  (allergy) =>
                                    allergy && allergy.trim().length > 0,
                                )
                            : [];

                          const allAllergies = [
                            ...medicalAllergies,
                            ...flagAllergies,
                          ];

                          return allAllergies.length > 0 ? (
                            allAllergies.map((allergy, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-red-50 rounded"
                              >
                                <span className="text-red-800">{allergy}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAllergy(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No known allergies
                            </p>
                          );
                        })()}
                      </div>
                      <div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add new allergy"
                            value={newAllergy}
                            onChange={(e) => setNewAllergy(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addAllergy()}
                          />
                          <Button onClick={addAllergy} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {allergyError && (
                          <p className="text-sm text-red-500 mt-1">
                            {allergyError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Chronic Conditions
                      </h4>
                      <div className="space-y-2 mb-4">
                        {patient.medicalHistory?.chronicConditions &&
                        patient.medicalHistory.chronicConditions.length > 0 ? (
                          patient.medicalHistory.chronicConditions.map(
                            (condition, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-blue-50 rounded"
                              >
                                <span className="text-blue-800">
                                  {condition}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChronicCondition(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-sm text-gray-500">
                            No chronic conditions
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add new condition"
                            value={newChronicCondition}
                            onChange={(e) =>
                              setNewChronicCondition(e.target.value)
                            }
                            onKeyPress={(e) =>
                              e.key === "Enter" && addChronicCondition()
                            }
                          />
                          <Button onClick={addChronicCondition} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {chronicConditionError && (
                          <p className="text-sm text-red-500 mt-1">
                            {chronicConditionError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAllChanges}
                  disabled={updateMedicalHistoryMutation.isPending}
                >
                  {updateMedicalHistoryMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="family">Family History</TabsTrigger>
            <TabsTrigger value="social">Social History</TabsTrigger>
            <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
          </TabsList>

          <TabsContent value="family" className="space-y-4">
            {Object.entries(familyHistory).map(([relationship, conditions]) => (
              <div key={relationship} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 capitalize flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {relationship === "siblings" ? "Siblings" : relationship}
                </h4>
                {conditions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No conditions reported
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {conditions.map((condition, index) => (
                      <Badge key={index} variant="outline">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Smoking</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.smoking.status.replace("_", " ")}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Alcohol</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.alcohol.status}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Exercise</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.exercise.frequency.replace("_", " ")}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Occupation</div>
                  <div className="text-sm text-gray-600">
                    {editedSocialHistory.occupation || "Not specified"}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Marital Status</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {editedSocialHistory.maritalStatus}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Education</div>
                  <div className="text-sm text-gray-600">
                    {editedSocialHistory.education || "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="immunizations" className="space-y-4">
            {immunizations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No immunization records</p>
              </div>
            ) : (
              <div className="space-y-2">
                {immunizations.map((immunization, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {immunization.vaccine}
                        </div>
                        <div className="text-sm text-gray-500">
                          {immunization.date} - {immunization.provider}
                        </div>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
