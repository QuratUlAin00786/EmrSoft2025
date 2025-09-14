import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Brain, Save, X } from "lucide-react";

const patientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required").refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  ),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().min(1, "Phone number is required").regex(
    /^[\+]?[0-9\s\-\(\)]{10,}$/,
    "Please enter a valid phone number"
  ),
  nhsNumber: z.string().trim().optional(),
  address: z.object({
    street: z.string().trim().min(1, "Street address is required"),
    city: z.string().trim().min(1, "City is required"),
    postcode: z.string().trim().min(1, "Postcode is required"),
    country: z.string().trim().min(1, "Country is required")
  }),
  insuranceInfo: z.object({
    provider: z.string().trim().optional(),
    policyNumber: z.string().trim().optional(),
    groupNumber: z.string().trim().optional(),
    memberNumber: z.string().trim().optional(),
    planType: z.string().trim().optional(),
    effectiveDate: z.string().trim().optional(),
    expirationDate: z.string().trim().optional(),
    copay: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
    deductible: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
    isActive: z.boolean().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().trim().min(1, "Emergency contact name is required"),
    relationship: z.string().trim().min(1, "Relationship is required"),
    phone: z.string().trim().min(1, "Emergency contact phone is required").regex(
      /^[\+]?[0-9\s\-\(\)]{10,}$/,
      "Please enter a valid phone number"
    )
  }),
  medicalHistory: z.object({
    allergies: z.string().trim().optional(),
    chronicConditions: z.string().trim().optional(),
    medications: z.string().trim().optional()
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
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): string => {
    if (!dateOfBirth) return "";
    
    const birthDate = new Date(dateOfBirth);
    const currentDate = new Date();
    
    if (birthDate > currentDate) return "";
    
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

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
        postcode: "",
        country: tenant?.region === "UK" ? "United Kingdom" : ""
      },
      insuranceInfo: {
        provider: "",
        policyNumber: "",
        groupNumber: "",
        memberNumber: "",
        planType: "",
        effectiveDate: "",
        expirationDate: "",
        copay: 0,
        deductible: 0,
        isActive: true
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

  // Watch for changes in date of birth to calculate age
  const watchedDateOfBirth = form.watch("dateOfBirth");
  const calculatedAge = useMemo(() => calculateAge(watchedDateOfBirth), [watchedDateOfBirth]);

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
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
    setAddressSuggestions([]);
  };

  const handlePostcodeLookup = async (postcode: string) => {
    if (!postcode || postcode.length < 5) return;
    
    try {
      // Using a free UK postcode API for address lookup
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode.replace(/\s+/g, '')}`);
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          // Auto-fill address fields
          form.setValue('address.city', data.result.admin_district || '');
          form.setValue('address.country', 'United Kingdom');
          
          toast({
            title: "Address found",
            description: `Location: ${data.result.admin_district}, ${data.result.admin_county}`,
          });
        }
      }
    } catch (error) {
      console.log('Postcode lookup not available');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Add New Patient
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
                            <Input type="date" {...field} data-testid="input-date-of-birth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Age field - automatically calculated */}
                    <div className="space-y-2">
                      <FormLabel>Age</FormLabel>
                      <Input 
                        type="text" 
                        value={calculatedAge ? `${calculatedAge} years old` : ""} 
                        placeholder="Age will be calculated automatically"
                        readOnly 
                        className="bg-gray-50 text-gray-700" 
                        data-testid="input-calculated-age"
                      />
                    </div>
                    
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
                            <Input 
                              {...field} 
                              placeholder="+44 123 456 7890"
                              type="tel"
                              onChange={(e) => {
                                // Auto-format UK phone numbers
                                let value = e.target.value.replace(/[^\d+]/g, '');
                                if (value.startsWith('0')) {
                                  value = '+44' + value.substring(1);
                                }
                                field.onChange(value);
                              }}
                            />
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
                              <Input {...field} placeholder="000 000 0000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Health Insurance Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Health Insurance Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceInfo.provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select insurance provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nhs">NHS (National Health Service)</SelectItem>
                              <SelectItem value="bupa">Bupa</SelectItem>
                              <SelectItem value="axa-ppp">AXA PPP Healthcare</SelectItem>
                              <SelectItem value="vitality">Vitality Health</SelectItem>
                              <SelectItem value="aviva">Aviva Health</SelectItem>
                              <SelectItem value="simply-health">Simply Health</SelectItem>
                              <SelectItem value="wpa">WPA</SelectItem>
                              <SelectItem value="benenden">Benenden Health</SelectItem>
                              <SelectItem value="healix">Healix Health Services</SelectItem>
                              <SelectItem value="sovereign">Sovereign Health Care</SelectItem>
                              <SelectItem value="exeter-friendly">Exeter Friendly Society</SelectItem>
                              <SelectItem value="self-pay">Self-Pay</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.planType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="dental-only">Dental Only</SelectItem>
                              <SelectItem value="optical-only">Optical Only</SelectItem>
                              <SelectItem value="mental-health">Mental Health</SelectItem>
                              <SelectItem value="maternity">Maternity</SelectItem>
                              <SelectItem value="specialist">Specialist</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter policy number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.memberNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter member number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceInfo.copay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Copay Amount (£)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              placeholder="0" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address.postcode"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Postcode (Auto-lookup)</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                {...field} 
                                placeholder="Enter postcode (e.g., SW1A 1AA)"
                                onChange={(e) => {
                                  field.onChange(e);
                                  handlePostcodeLookup(e.target.value);
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePostcodeLookup(field.value)}
                                disabled={!field.value || field.value.length < 5}
                              >
                                Lookup
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter street address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City/Town</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <FormField
                      control={form.control}
                      name="address.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                              <SelectItem value="Ireland">Ireland</SelectItem>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="Canada">Canada</SelectItem>
                              <SelectItem value="Australia">Australia</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <Input {...field} placeholder="Enter emergency contact name" />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="parent">Parent</SelectItem>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="sibling">Sibling</SelectItem>
                                <SelectItem value="friend">Friend</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
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

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
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
                  {createPatientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Patient
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}