import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Heart, AlertTriangle, Edit, Trash2, Activity } from "lucide-react";
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

const commonConditions = [
  "Heart Disease", "Diabetes", "Cancer", "Hypertension", "Stroke", "Depression",
  "Anxiety", "Asthma", "COPD", "Kidney Disease", "Liver Disease", "Arthritis",
  "Osteoporosis", "Alzheimer's", "Parkinson's", "Epilepsy", "Thyroid Disease"
];

const relatives = [
  "Mother", "Father", "Maternal Grandmother", "Maternal Grandfather",
  "Paternal Grandmother", "Paternal Grandfather", "Sister", "Brother",
  "Maternal Aunt", "Maternal Uncle", "Paternal Aunt", "Paternal Uncle",
  "Daughter", "Son", "Other"
];

export default function PatientFamilyHistory({ patient, onUpdate }: PatientFamilyHistoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("family");
  const [newCondition, setNewCondition] = useState<Partial<FamilyCondition>>({
    relative: "",
    condition: "",
    severity: "mild"
  });

  const familyHistory = patient.medicalHistory?.familyHistory || {
    father: [],
    mother: [],
    siblings: [],
    grandparents: []
  };

  const socialHistory: SocialHistory = patient.medicalHistory?.socialHistory || {
    smoking: { status: "never" },
    alcohol: { status: "never" },
    drugs: { status: "never" },
    occupation: "",
    maritalStatus: "single",
    education: "",
    exercise: { frequency: "none" }
  };

  const immunizations = patient.medicalHistory?.immunizations || [];

  const addFamilyCondition = () => {
    if (!newCondition.relative || !newCondition.condition) return;

    const condition = `${newCondition.condition}${newCondition.ageOfOnset ? ` (age ${newCondition.ageOfOnset})` : ''}${newCondition.notes ? ` - ${newCondition.notes}` : ''}`;
    
    const updatedHistory = { ...familyHistory };
    const relativeKey = newCondition.relative?.toLowerCase().includes('father') ? 'father' :
                       newCondition.relative?.toLowerCase().includes('mother') ? 'mother' :
                       newCondition.relative?.toLowerCase().includes('sibling') || newCondition.relative?.toLowerCase().includes('sister') || newCondition.relative?.toLowerCase().includes('brother') ? 'siblings' :
                       'grandparents';

    if (!updatedHistory[relativeKey]) updatedHistory[relativeKey] = [];
    updatedHistory[relativeKey].push(condition);

    onUpdate({
      medicalHistory: {
        ...patient.medicalHistory,
        familyHistory: updatedHistory
      }
    });

    setNewCondition({ relative: "", condition: "", severity: "mild" });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild": return "bg-yellow-100 text-yellow-800";
      case "moderate": return "bg-orange-100 text-orange-800";
      case "severe": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Complete Patient History
          </CardTitle>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete Medical History</DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="family">Family History</TabsTrigger>
                  <TabsTrigger value="social">Social History</TabsTrigger>
                  <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
                  <TabsTrigger value="allergies">Allergies & Conditions</TabsTrigger>
                </TabsList>

                <TabsContent value="family" className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Add Family Medical Condition</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Family Member</Label>
                        <Select 
                          value={newCondition.relative} 
                          onValueChange={(value) => setNewCondition({ ...newCondition, relative: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relative" />
                          </SelectTrigger>
                          <SelectContent>
                            {relatives.map(rel => (
                              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Medical Condition</Label>
                        <Select 
                          value={newCondition.condition} 
                          onValueChange={(value) => setNewCondition({ ...newCondition, condition: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {commonConditions.map(condition => (
                              <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Age of Onset</Label>
                        <Input 
                          placeholder="e.g., 45"
                          value={newCondition.ageOfOnset || ""}
                          onChange={(e) => setNewCondition({ ...newCondition, ageOfOnset: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select 
                          value={newCondition.severity} 
                          onValueChange={(value: any) => setNewCondition({ ...newCondition, severity: value })}
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
                        onChange={(e) => setNewCondition({ ...newCondition, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(familyHistory).map(([relationship, conditions]) => (
                      <div key={relationship} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 capitalize flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          {relationship === 'siblings' ? 'Siblings' : relationship}
                        </h5>
                        {conditions.length === 0 ? (
                          <p className="text-sm text-gray-500">No conditions reported</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {conditions.map((condition, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Smoking Status</Label>
                        <Select defaultValue={socialHistory.smoking.status}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never smoked</SelectItem>
                            <SelectItem value="former">Former smoker</SelectItem>
                            <SelectItem value="current">Current smoker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Alcohol Consumption</Label>
                        <Select defaultValue={socialHistory.alcohol.status}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="occasional">Occasional</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Exercise Frequency</Label>
                        <Select defaultValue={socialHistory.exercise.frequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No exercise</SelectItem>
                            <SelectItem value="occasional">Occasional</SelectItem>
                            <SelectItem value="regular">Regular (2-3x/week)</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Occupation</Label>
                        <Input defaultValue={socialHistory.occupation} placeholder="Current or former occupation" />
                      </div>
                      <div>
                        <Label>Marital Status</Label>
                        <Select defaultValue={socialHistory.maritalStatus}>
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
                        <Input defaultValue={socialHistory.education} placeholder="Highest education level" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="immunizations" className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Immunization Record</h4>
                    <div className="space-y-3">
                      {immunizations.length === 0 ? (
                        <p className="text-sm text-gray-500">No immunization records</p>
                      ) : (
                        immunizations.map((immunization, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{immunization.vaccine}</div>
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
                    <Button className="w-full mt-4" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Immunization
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="allergies" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Known Allergies
                      </h4>
                      <div className="space-y-2">
                        {patient.medicalHistory?.allergies?.map((allergy, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <span className="text-red-800">{allergy}</span>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )) || <p className="text-sm text-gray-500">No known allergies</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Chronic Conditions
                      </h4>
                      <div className="space-y-2">
                        {patient.medicalHistory?.chronicConditions?.map((condition, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <span className="text-blue-800">{condition}</span>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        )) || <p className="text-sm text-gray-500">No chronic conditions</p>}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsEditing(false)}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="family">Family History</TabsTrigger>
            <TabsTrigger value="social">Social History</TabsTrigger>
            <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Allergies
                </h4>
                {patient.medicalHistory?.allergies?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {patient.medicalHistory.allergies.map((allergy, index) => (
                      <Badge key={index} className="bg-red-100 text-red-800">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No known allergies</p>
                )}
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-600">
                  <Activity className="h-4 w-4" />
                  Chronic Conditions
                </h4>
                {patient.medicalHistory?.chronicConditions?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {patient.medicalHistory.chronicConditions.map((condition, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-800">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No chronic conditions</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            {Object.entries(familyHistory).map(([relationship, conditions]) => (
              <div key={relationship} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 capitalize flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {relationship === 'siblings' ? 'Siblings' : relationship}
                </h4>
                {conditions.length === 0 ? (
                  <p className="text-sm text-gray-500">No conditions reported</p>
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
                    {socialHistory.smoking.status.replace('_', ' ')}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Alcohol</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {socialHistory.alcohol.status}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Exercise</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {socialHistory.exercise.frequency.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Occupation</div>
                  <div className="text-sm text-gray-600">
                    {socialHistory.occupation || "Not specified"}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Marital Status</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {socialHistory.maritalStatus}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-medium text-sm">Education</div>
                  <div className="text-sm text-gray-600">
                    {socialHistory.education || "Not specified"}
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
                        <div className="font-medium">{immunization.vaccine}</div>
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