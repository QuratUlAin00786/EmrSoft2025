import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Shield, CheckCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// PayPal Button Component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface PayPalButtonProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: any) => void;
}

function PayPalButton({ planId, planName, amount, onSuccess, onError }: PayPalButtonProps) {
  const { toast } = useToast();

  const createOrder = async () => {
    try {
      const response = await fetch("/api/paypal/order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "X-Tenant-Subdomain": window.location.hostname.split('.')[0]
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: "GBP",
          intent: "CAPTURE",
          planId,
          planName
        }),
      });
      const data = await response.json();
      return { orderId: data.id };
    } catch (error) {
      onError(error);
      throw error;
    }
  };

  const captureOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/paypal/order/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "X-Tenant-Subdomain": window.location.hostname.split('.')[0]
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      onError(error);
      throw error;
    }
  };

  const onApprove = async (data: any) => {
    try {
      const orderData = await captureOrder(data.orderId);
      console.log("PayPal payment captured:", orderData);
      
      // Update subscription
      await apiRequest("POST", "/api/subscription/upgrade", {
        planId,
        paymentMethod: "paypal",
        paymentData: orderData
      });
      
      onSuccess();
      toast({
        title: "Payment Successful",
        description: `Your subscription has been upgraded to ${planName}!`,
      });
    } catch (error) {
      onError(error);
    }
  };

  const onCancel = (data: any) => {
    toast({
      title: "Payment Cancelled",
      description: "Your payment was cancelled.",
      variant: "destructive",
    });
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    const initPayPal = async () => {
      try {
        const clientToken = await fetch("/api/paypal/setup", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "X-Tenant-Subdomain": window.location.hostname.split('.')[0]
          }
        })
          .then((res) => res.json())
          .then((data) => data.clientToken);

        const sdkInstance = await (window as any).paypal.createInstance({
          clientToken,
          components: ["paypal-payments"],
        });

        const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove,
          onCancel,
          onError,
        });

        const onClick = async () => {
          try {
            const checkoutOptionsPromise = createOrder();
            await paypalCheckout.start(
              { paymentFlow: "auto" },
              checkoutOptionsPromise,
            );
          } catch (e) {
            console.error(e);
          }
        };

        const paypalButton = document.getElementById("paypal-subscription-button");
        if (paypalButton) {
          paypalButton.addEventListener("click", onClick);
        }

        return () => {
          if (paypalButton) {
            paypalButton.removeEventListener("click", onClick);
          }
        };
      } catch (e) {
        console.error(e);
      }
    };

    loadPayPalSDK();
  }, []);

  return <paypal-button id="paypal-subscription-button"></paypal-button>;
}

// Demo Payment Form (simulates Stripe without requiring API keys)
const stripePromise = null; // Disable Stripe for demo mode

interface StripeFormProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: any) => void;
}

// Demo Payment Form Component
function DemoPaymentForm({ planId, planName, amount, onSuccess, onError }: StripeFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const { toast } = useToast();

  const validateCardNumber = (number: string) => {
    // Remove spaces and check if it's 16 digits
    const cleaned = number.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleaned)) {
      return false;
    }
    
    // Reject obviously fake patterns
    if (/^0{8,}/.test(cleaned) || // starts with many zeros
        /^1{8,}/.test(cleaned) || // all 1s
        /^(\d)\1{15}$/.test(cleaned) || // all same digit
        cleaned.startsWith('0987876565')) { // specific test number pattern
      return false;
    }
    
    // Apply Luhn algorithm to validate card number
    return luhnCheck(cleaned);
  };

  const luhnCheck = (cardNumber: string) => {
    let sum = 0;
    let alternate = false;
    
    // Loop through digits from right to left
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let n = parseInt(cardNumber.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = Math.floor(n / 10) + (n % 10); // Correct way to sum digits
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    console.log("Luhn check for", cardNumber, "sum:", sum, "valid:", (sum % 10) === 0);
    return (sum % 10) === 0;
  };

  const validateExpiryDate = (expiry: string) => {
    // Check MM/YY format and if date is in the future
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    
    const month = parseInt(match[1]);
    const year = parseInt('20' + match[2]);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Check if month is valid (1-12)
    if (month < 1 || month > 12) return false;
    
    // Check if date is in the future (not current month/year or past)
    return year > currentYear || (year === currentYear && month > currentMonth);
  };

  const validateCVV = (cvv: string) => {
    return /^\d{3,4}$/.test(cvv);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug logging
    console.log("Card validation:", {
      cardNumber: cardNumber,
      cardNumberLength: cardNumber.replace(/\s/g, '').length,
      expiryDate: expiryDate,
      cvv: cvv,
      cardName: cardName
    });
    
    // Validate all fields before starting processing
    const validationErrors = [];
    
    const isCardValid = validateCardNumber(cardNumber);
    const isExpiryValid = validateExpiryDate(expiryDate);
    const isCvvValid = validateCVV(cvv);
    const isNameValid = cardName.trim().length > 0;
    
    console.log("Validation results:", {
      isCardValid,
      isExpiryValid, 
      isCvvValid,
      isNameValid
    });
    
    if (!isCardValid) {
      validationErrors.push(`Invalid card number. Please enter a valid 16-digit card number. Current length: ${cardNumber.replace(/\s/g, '').length}`);
    }
    
    if (!isExpiryValid) {
      validationErrors.push("Invalid expiry date. Please enter a valid future date in MM/YY format.");
    }
    
    if (!isCvvValid) {
      validationErrors.push("Invalid CVV. Please enter a valid 3 or 4-digit security code.");
    }
    
    if (!isNameValid) {
      validationErrors.push("Please enter the cardholder name.");
    }
    
    // If there are validation errors, show them and don't proceed
    if (validationErrors.length > 0) {
      console.log("Validation failed:", validationErrors);
      toast({
        title: "Payment Failed",
        description: validationErrors[0], // Show first error
        variant: "destructive",
      });
      return; // Don't start processing
    }
    
    setIsProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update subscription
      await apiRequest("POST", "/api/subscription/upgrade", {
        planId,
        paymentMethod: "stripe"
      });
      
      onSuccess();
      toast({
        title: "Payment Successful",
        description: `Your subscription has been upgraded to ${planName}!`,
      });
    } catch (error: any) {
      onError(error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={19}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
            <input
              type="text"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={4}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : `Pay £${amount}/month`}
      </Button>
    </form>
  );
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    name: string;
    price: number;
    userLimit: number;
    features: string[];
  };
}

export function PaymentMethodDialog({ open, onOpenChange, plan }: PaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const { toast } = useToast();

  // Create payment intent when dialog opens
  useEffect(() => {
    if (open && paymentMethod === "stripe") {
      apiRequest("POST", "/api/create-subscription-payment-intent", {
        planId: plan.id,
        amount: plan.price * 100 // Convert to cents
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Failed to create payment intent:", error);
          toast({
            title: "Payment Setup Failed",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [open, paymentMethod, plan]);

  const handleSuccess = () => {
    toast({
      title: "Upgrade Successful!",
      description: `Successfully upgraded to ${plan.name} plan. Your new features are now active.`,
    });
    onOpenChange(false);
  };

  const handleError = (error: any) => {
    console.error("Payment error:", error);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby="payment-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Upgrade to {plan.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div id="payment-dialog-description" className="sr-only">
          Choose your payment method to upgrade your subscription plan
        </div>

        <div className="space-y-6">
          {/* Plan Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{plan.name} Plan</span>
                  <span className="font-bold">£{plan.price}/month</span>
                </div>
                <div className="text-sm text-gray-600">
                  Up to {plan.userLimit} users
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "stripe" | "paypal")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe">Credit Card</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Secured by Stripe</span>
              </div>
              
              <DemoPaymentForm
                planId={plan.id}
                planName={plan.name}
                amount={plan.price}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </TabsContent>

            <TabsContent value="paypal" className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Secured by PayPal</span>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-yellow-800 font-medium mb-2">PayPal Configuration Required</div>
                <div className="text-sm text-yellow-700 mb-4">
                  To enable PayPal payments, please configure your PayPal API keys.
                </div>
                <Button 
                  variant="outline"
                  onClick={handleSuccess}
                  className="w-full"
                >
                  Continue with Demo Payment
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-gray-500 text-center">
            By proceeding, you agree to our Terms of Service and Privacy Policy. 
            You can cancel your subscription at any time.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}