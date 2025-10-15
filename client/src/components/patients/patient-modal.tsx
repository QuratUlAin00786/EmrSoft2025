import { useState, useMemo, useEffect } from "react";
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

// Country codes with flags
const COUNTRY_CODES = [
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" }
] as const;

// Digit limits for each country code (excluding country code itself)
const COUNTRY_DIGIT_LIMITS: Record<string, number> = {
  "+1": 10,    // United States / Canada
  "+44": 10,   // United Kingdom
  "+92": 10,   // Pakistan
  "+966": 9,   // Saudi Arabia
  "+971": 9,   // UAE
  "+91": 10,   // India
  "+33": 9,    // France
  "+49": 11,   // Germany
  "+39": 10,   // Italy
  "+34": 9     // Spain
};

const patientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required").refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  ),
  genderAtBirth: z.string().trim().optional(),
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
  editMode?: boolean;
  editPatient?: any;
}

export function PatientModal({ open, onOpenChange, editMode = false, editPatient }: PatientModalProps) {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [emailError, setEmailError] = useState<string>("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Country code state
  const [selectedCountryCode, setSelectedCountryCode] = useState("+44");
  const [emergencyCountryCode, setEmergencyCountryCode] = useState("+44");
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    defaultValues: editMode && editPatient ? {
      firstName: editPatient.firstName || "",
      lastName: editPatient.lastName || "",
      dateOfBirth: editPatient.dateOfBirth || "",
      genderAtBirth: editPatient.genderAtBirth || "",
      email: editPatient.email || "",
      phone: editPatient.phone || "",
      nhsNumber: editPatient.nhsNumber || "",
      address: {
        street: editPatient.address?.street || "",
        city: editPatient.address?.city || "",
        postcode: editPatient.address?.postcode || "",
        country: editPatient.address?.country || (tenant?.region === "UK" ? "United Kingdom" : "")
      },
      insuranceInfo: {
        provider: editPatient.insuranceInfo?.provider || "",
        policyNumber: editPatient.insuranceInfo?.policyNumber || "",
        groupNumber: editPatient.insuranceInfo?.groupNumber || "",
        memberNumber: editPatient.insuranceInfo?.memberNumber || "",
        planType: editPatient.insuranceInfo?.planType || "",
        effectiveDate: editPatient.insuranceInfo?.effectiveDate || "",
        expirationDate: editPatient.insuranceInfo?.expirationDate || "",
        copay: editPatient.insuranceInfo?.copay || 0,
        deductible: editPatient.insuranceInfo?.deductible || 0,
        isActive: editPatient.insuranceInfo?.isActive ?? true
      },
      emergencyContact: {
        name: editPatient.emergencyContact?.name || "",
        relationship: editPatient.emergencyContact?.relationship || "",
        phone: editPatient.emergencyContact?.phone || ""
      },
      medicalHistory: {
        allergies: Array.isArray(editPatient.medicalHistory?.allergies) 
          ? editPatient.medicalHistory.allergies.join(", ") 
          : "",
        chronicConditions: Array.isArray(editPatient.medicalHistory?.chronicConditions) 
          ? editPatient.medicalHistory.chronicConditions.join(", ") 
          : "",
        medications: Array.isArray(editPatient.medicalHistory?.medications) 
          ? editPatient.medicalHistory.medications.join(", ") 
          : ""
      }
    } : {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      genderAtBirth: "",
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

  // Watch for email changes and check availability
  const watchedEmail = form.watch("email");
  
  useEffect(() => {
    // Don't check in edit mode or if email is empty
    if (editMode || !watchedEmail || watchedEmail.trim() === "") {
      setEmailError("");
      return;
    }

    // Debounce email check
    const timeoutId = setTimeout(async () => {
      try {
        setIsCheckingEmail(true);
        setEmailError("");
        
        const response = await apiRequest("GET", `/api/patients/check-email?email=${encodeURIComponent(watchedEmail)}`);
        const data = await response.json();
        
        if (!data.emailAvailable) {
          if (data.associatedWithAnotherOrg) {
            setEmailError("This email is associated with another Cura's organization.");
          } else {
            setEmailError("This email is already in use.");
          }
        }
      } catch (error) {
        console.error("Error checking email:", error);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, editMode]);

  // Reset form when editPatient, editMode, or open state changes
  useEffect(() => {
    const formValues = editMode && editPatient ? {
      firstName: editPatient.firstName || "",
      lastName: editPatient.lastName || "",
      dateOfBirth: editPatient.dateOfBirth || "",
      genderAtBirth: editPatient.genderAtBirth || "",
      email: editPatient.email || "",
      phone: editPatient.phone || "",
      nhsNumber: editPatient.nhsNumber || "",
      address: {
        street: editPatient.address?.street || "",
        city: editPatient.address?.city || "",
        postcode: editPatient.address?.postcode || "",
        country: editPatient.address?.country || (tenant?.region === "UK" ? "United Kingdom" : "")
      },
      insuranceInfo: {
        provider: editPatient.insuranceInfo?.provider || "",
        policyNumber: editPatient.insuranceInfo?.policyNumber || "",
        groupNumber: editPatient.insuranceInfo?.groupNumber || "",
        memberNumber: editPatient.insuranceInfo?.memberNumber || "",
        planType: editPatient.insuranceInfo?.planType || "",
        effectiveDate: editPatient.insuranceInfo?.effectiveDate || "",
        expirationDate: editPatient.insuranceInfo?.expirationDate || "",
        copay: editPatient.insuranceInfo?.copay || 0,
        deductible: editPatient.insuranceInfo?.deductible || 0,
        isActive: editPatient.insuranceInfo?.isActive ?? true
      },
      emergencyContact: {
        name: editPatient.emergencyContact?.name || "",
        relationship: editPatient.emergencyContact?.relationship || "",
        phone: editPatient.emergencyContact?.phone || ""
      },
      medicalHistory: {
        allergies: Array.isArray(editPatient.medicalHistory?.allergies) 
          ? editPatient.medicalHistory.allergies.join(", ") 
          : "",
        chronicConditions: Array.isArray(editPatient.medicalHistory?.chronicConditions) 
          ? editPatient.medicalHistory.chronicConditions.join(", ") 
          : "",
        medications: Array.isArray(editPatient.medicalHistory?.medications) 
          ? editPatient.medicalHistory.medications.join(", ") 
          : ""
      }
    } : {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      genderAtBirth: "",
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
    };

    form.reset(formValues);
    setEmailError(""); // Clear email error when form resets

    // Extract country codes from phone numbers after form reset
    if (editMode && editPatient) {
      const phoneValue = editPatient.phone || "";
      const emergencyPhoneValue = editPatient.emergencyContact?.phone || "";
      
      const matchedPhoneCode = COUNTRY_CODES.find(c => phoneValue.startsWith(c.code));
      if (matchedPhoneCode) {
        setSelectedCountryCode(matchedPhoneCode.code);
      } else {
        setSelectedCountryCode("+44"); // Default to UK
      }

      const matchedEmergencyCode = COUNTRY_CODES.find(c => emergencyPhoneValue.startsWith(c.code));
      if (matchedEmergencyCode) {
        setEmergencyCountryCode(matchedEmergencyCode.code);
      } else {
        setEmergencyCountryCode("+44"); // Default to UK
      }
    } else {
      // Reset to defaults for new patient
      setSelectedCountryCode("+44");
      setEmergencyCountryCode("+44");
    }
  }, [editPatient, editMode, open, tenant?.region, form]);

  const patientMutation = useMutation({
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

      if (editMode && editPatient) {
        return apiRequest('PATCH', `/api/patients/${editPatient.id}`, transformedData);
      } else {
        return apiRequest('POST', '/api/patients', transformedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSuccessMessage(editMode ? "The patient information has been updated." : "The patient has been added to your records.");
      setShowSuccessModal(true);
      onOpenChange(false);
      form.reset();
      setShowAiInsights(false);
    },
    onError: (error: any) => {
      toast({
        title: editMode ? "Error updating patient" : "Error creating patient",
        description: error.message || (editMode ? "Failed to update patient. Please try again." : "Failed to create patient. Please try again."),
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PatientFormData) => {
    patientMutation.mutate(data);
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
            {editMode ? `Edit ${editPatient?.firstName} ${editPatient?.lastName}` : "Add New Patient"}
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
                          {calculatedAge && (
                            <p className="text-sm text-gray-600 mt-1">
                              Age: {calculatedAge} years old
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="genderAtBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender at Birth</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
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
                          {emailError && (
                            <p className="text-sm text-red-600 mt-1">{emailError}</p>
                          )}
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
                            <div className="flex gap-2">
                              <Select 
                                value={selectedCountryCode} 
                                onValueChange={(value) => {
                                  setSelectedCountryCode(value);
                                  // Extract local number by removing current country code
                                  let localNumber = field.value;
                                  if (localNumber.startsWith(selectedCountryCode)) {
                                    localNumber = localNumber.slice(selectedCountryCode.length).trim();
                                  }
                                  field.onChange(localNumber ? `${value} ${localNumber}` : '');
                                }}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      <span>{COUNTRY_CODES.find(c => c.code === selectedCountryCode)?.flag}</span>
                                      <span>{selectedCountryCode}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRY_CODES.map((country) => (
                                    <SelectItem key={country.code} value={country.code}>
                                      <div className="flex items-center gap-2">
                                        <span>{country.flag}</span>
                                        <span>{country.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input 
                                {...field} 
                                placeholder="123 456 7890"
                                type="tel"
                                className="flex-1"
                                maxLength={COUNTRY_DIGIT_LIMITS[selectedCountryCode] || 15}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d]/g, '');
                                  const maxDigits = COUNTRY_DIGIT_LIMITS[selectedCountryCode] || 15;
                                  
                                  // Limit to max digits for selected country
                                  if (value.length > maxDigits) {
                                    value = value.slice(0, maxDigits);
                                  }
                                  
                                  // If the phone number is empty, set the field to empty string
                                  if (value === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(`${selectedCountryCode} ${value}`);
                                  }
                                }}
                                value={
                                  field.value.startsWith(selectedCountryCode)
                                    ? field.value.slice(selectedCountryCode.length).trim()
                                    : field.value
                                }
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">
                            Must be exactly {COUNTRY_DIGIT_LIMITS[selectedCountryCode]} digits (excluding country code)
                          </p>
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
                          <FormControl>
                            <Input {...field} placeholder="Enter insurance provider" />
                          </FormControl>
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
                          <FormControl>
                            <Input {...field} placeholder="Enter plan type" />
                          </FormControl>
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
                      name="nhsNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NHS Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter NHS number" />
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
                            <div className="flex gap-2">
                              <Select 
                                value={emergencyCountryCode} 
                                onValueChange={(value) => {
                                  setEmergencyCountryCode(value);
                                  // Extract local number by removing current country code
                                  let localNumber = field.value;
                                  if (localNumber.startsWith(emergencyCountryCode)) {
                                    localNumber = localNumber.slice(emergencyCountryCode.length).trim();
                                  }
                                  field.onChange(localNumber ? `${value} ${localNumber}` : '');
                                }}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      <span>{COUNTRY_CODES.find(c => c.code === emergencyCountryCode)?.flag}</span>
                                      <span>{emergencyCountryCode}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRY_CODES.map((country) => (
                                    <SelectItem key={country.code} value={country.code}>
                                      <div className="flex items-center gap-2">
                                        <span>{country.flag}</span>
                                        <span>{country.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input 
                                {...field} 
                                placeholder="123 456 7890"
                                type="tel"
                                className="flex-1"
                                maxLength={COUNTRY_DIGIT_LIMITS[emergencyCountryCode] || 15}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d]/g, '');
                                  const maxDigits = COUNTRY_DIGIT_LIMITS[emergencyCountryCode] || 15;
                                  
                                  // Limit to max digits for selected country
                                  if (value.length > maxDigits) {
                                    value = value.slice(0, maxDigits);
                                  }
                                  
                                  // If the phone number is empty, set the field to empty string
                                  if (value === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(`${emergencyCountryCode} ${value}`);
                                  }
                                }}
                                value={
                                  field.value.startsWith(emergencyCountryCode)
                                    ? field.value.slice(emergencyCountryCode.length).trim()
                                    : field.value
                                }
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">
                            Must be exactly {COUNTRY_DIGIT_LIMITS[emergencyCountryCode]} digits (excluding country code)
                          </p>
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
                  disabled={patientMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={patientMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  {patientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editMode ? "Update Patient" : "Create Patient"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}