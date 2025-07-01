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

// Stripe Payment Form
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : null;

interface StripeFormProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: any) => void;
}

function StripeForm({ planId, planName, amount, onSuccess, onError }: StripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription?success=true&plan=${planId}`,
        },
      });

      if (error) {
        onError(error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
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
      }
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
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full"
        disabled={!stripe || isProcessing}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Upgrade to {plan.name}</span>
          </DialogTitle>
        </DialogHeader>

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
              
              {!stripePromise ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-yellow-800 font-medium mb-2">Stripe Configuration Required</div>
                  <div className="text-sm text-yellow-700 mb-4">
                    To enable credit card payments, please configure your Stripe API keys.
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleSuccess}
                    className="w-full"
                  >
                    Continue with Demo Payment
                  </Button>
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeForm
                    planId={plan.id}
                    planName={plan.name}
                    amount={plan.price}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
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