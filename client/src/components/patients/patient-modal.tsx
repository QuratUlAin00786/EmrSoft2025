import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Brain, Save, X } from "lucide-react";

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  nhsNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional()
  }).optional(),
  medicalHistory: z.object({
    allergies: z.string().optional(),
    chronicConditions: z.string().optional(),
    medications: z.string().optional()
  }).optional()
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientModal({ open, onOpenChange }: PatientModalProps) {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAiInsights, setShowAiInsights] = useState(false);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      nhsNumber: "",
      address: {
        street: "",
        city: "",
        state: "",
        postcode: "",
        country: tenant?.region === "UK" ? "United Kingdom" : ""
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: ""
      },
      medicalHistory: {
        allergies: "",
        chronicConditions: "",
        medications: ""
      }
    }
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      // Transform string fields to arrays for medical history
      const transformedData = {
        ...data,
        email: data.email || undefined,
        medicalHistory: {
          allergies: data.medicalHistory?.allergies ? data.medicalHistory.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
          chronicConditions: data.medicalHistory?.chronicConditions ? data.medicalHistory.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
          medications: data.medicalHistory?.medications ? data.medicalHistory.medications.split(',').map(s => s.trim()).filter(Boolean) : []
        }
      };

      return apiRequest('POST', '/api/patients', transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Patient created successfully",
        description: "The patient has been added to your records.",
      });
      onOpenChange(false);
      form.reset();
      setShowAiInsights(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating patient",
        description: error.message || "Failed to create patient. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setShowAiInsights(false);
  };

  // Calculate age for AI insights
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAiInsights = () => {
    const watchedValues = form.watch();
    const age = calculateAge(watchedValues.dateOfBirth);
    const hasChronicConditions = watchedValues.medicalHistory?.chronicConditions;
    const hasAllergies = watchedValues.medicalHistory?.allergies;

    const insights = [];

    if (age > 0) {
      if (age >= 65) {
        insights.push("Consider scheduling regular cardiovascular screenings for this senior patient.");
      }
      if (age >= 50) {
        insights.push("Recommend routine cancer screenings appropriate for this age group.");
      }
      if (age >= 40) {
        insights.push("Annual health checkups and diabetes screening recommended.");
      }
    }

    if (hasChronicConditions) {
      insights.push("Monitor chronic conditions closely and ensure medication compliance.");
    }

    if (hasAllergies) {
      insights.push("Alert: Document all allergies clearly to prevent adverse reactions.");
    }

    return insights;
  };

  const aiInsights = tenant?.settings?.features?.aiEnabled ? getAiInsights() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Patient
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-neutral-600 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter first name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter last name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required">Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="patient@email.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+44 123 456 7890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {tenant?.region === "UK" && (
                      <FormField
                        control={form.control}
                        name="nhsNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NHS Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="xxx xxx xxxx" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Main Street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="London" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address.postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="SW1A 1AA" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="emergencyContact.relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Spouse, Parent, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="emergencyContact.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+44 123 456 7890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Medical History */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Medical History</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="medicalHistory.allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allergies</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="List any known allergies (separate with commas)"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="medicalHistory.chronicConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chronic Conditions</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="List any chronic conditions (separate with commas)"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="medicalHistory.medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Medications</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="List current medications (separate with commas)"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              {tenant?.settings?.features?.aiEnabled && aiInsights.length > 0 && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-purple-900">AI Health Insights</h3>
                      <Badge className="ai-gradient text-white">AI</Badge>
                    </div>
                    <div className="space-y-2">
                      {aiInsights.map((insight, index) => (
                        <p key={index} className="text-sm text-purple-700 flex items-start space-x-2">
                          <span className="text-purple-500 font-bold">•</span>
                          <span>{insight}</span>
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={createPatientMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPatientMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createPatientMutation.isPending ? "Creating..." : "Save Patient"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
