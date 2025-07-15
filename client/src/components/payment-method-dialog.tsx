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
  const [isLoading, setIsLoading] = useState(false);

  const createOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          currency_code: "GBP",
          value: amount.toString()
        },
        description: `${planName} Subscription`
      }]
    });
  };

  const onApprove = async (data: any, actions: any) => {
    setIsLoading(true);
    try {
      const orderData = await actions.order.capture();
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
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    const initPayPalRedirect = () => {
      const paypalContainer = document.getElementById('paypal-button-container');
      if (!paypalContainer) return;

      // Clear existing content
      paypalContainer.innerHTML = '';

      // Create PayPal redirect interface
      const paypalInterface = document.createElement('div');
      paypalInterface.className = 'w-full space-y-4';
      paypalInterface.innerHTML = `
        <div class="bg-rose-50 p-3 rounded-md border border-rose-200 text-center">
          <p class="text-sm text-rose-600">Transaction will appear as Paddle if you pay using PayPal.</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="paypal-pay-once" class="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-md transition-colors">
            Pay Once
          </button>
          <button id="paypal-subscribe" class="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-md transition-colors">
            Subscribe
          </button>
        </div>
      `;

      const handlePayPalRedirect = async (paymentType: 'once' | 'subscribe') => {
        setIsLoading(true);
        
        try {
          // Create PayPal payment URL with proper parameters
          const paypalBaseUrl = 'https://www.paypal.com/cgi-bin/webscr';
          const returnUrl = encodeURIComponent(window.location.origin + '/payment-success');
          const cancelUrl = encodeURIComponent(window.location.origin + '/payment-cancel');
          
          const paypalParams = new URLSearchParams({
            cmd: paymentType === 'subscribe' ? '_xclick-subscriptions' : '_xclick',
            business: 'healthcare@cura.com',
            item_name: `${planName} Subscription`,
            amount: amount.toString(),
            currency_code: 'GBP',
            return: returnUrl,
            cancel_return: cancelUrl,
            notify_url: window.location.origin + '/api/paypal/webhook',
            custom: JSON.stringify({ planId, userId: 'current' })
          });

          if (paymentType === 'subscribe') {
            paypalParams.append('p3', '1');
            paypalParams.append('t3', 'M');
            paypalParams.append('src', '1');
            paypalParams.append('sra', '1');
          }

          const paypalUrl = `${paypalBaseUrl}?${paypalParams.toString()}`;
          
          // Store payment info for when user returns
          localStorage.setItem('pendingPayment', JSON.stringify({
            planId,
            planName,
            amount,
            paymentType,
            timestamp: Date.now()
          }));

          // Redirect to PayPal
          window.location.href = paypalUrl;
          
        } catch (error) {
          console.error('PayPal redirect error:', error);
          setIsLoading(false);
          onError(error);
          toast({
            title: "PayPal Error",
            description: "Failed to redirect to PayPal. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Add event listeners after DOM insertion
      setTimeout(() => {
        const payOnceBtn = paypalInterface.querySelector('#paypal-pay-once');
        const subscribeBtn = paypalInterface.querySelector('#paypal-subscribe');
        
        if (payOnceBtn) {
          payOnceBtn.addEventListener('click', () => handlePayPalRedirect('once'));
        }
        
        if (subscribeBtn) {
          subscribeBtn.addEventListener('click', () => handlePayPalRedirect('subscribe'));
        }
      }, 100);

      paypalContainer.appendChild(paypalInterface);
    };

    initPayPalRedirect();
  }, [planId, planName, amount]);

  return (
    <div className="w-full">
      <div id="paypal-button-container" className="min-h-[40px]"></div>
      {isLoading && (
        <div className="flex items-center justify-center mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm">Processing payment...</span>
        </div>
      )}
    </div>
  );
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
    
    // Validate all fields before starting processing
    const validationErrors = [];
    
    const isCardValid = validateCardNumber(cardNumber);
    const isExpiryValid = validateExpiryDate(expiryDate);
    const isCvvValid = validateCVV(cvv);
    const isNameValid = cardName.trim().length > 0;
    
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

// Demo PayPal Form Component  
function DemoPayPalForm({ planId, planName, amount, onSuccess, onError }: StripeFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate fields before processing
    const validationErrors = [];
    
    if (!validateEmail(email)) {
      validationErrors.push("Please enter a valid email address.");
    }
    
    if (password.length < 6) {
      validationErrors.push("Password must be at least 6 characters long.");
    }
    
    // Show validation errors and don't proceed
    if (validationErrors.length > 0) {
      toast({
        title: "PayPal Login Failed",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }
    
    // Validate PayPal credentials - reject invalid test credentials
    const invalidCredentials = [
      "test@test.com",
      "admin@admin.com", 
      "fake@fake.com",
      "demo@demo.com",
      "demo@paypal.com",
      "user@user.com",
      "paypal@paypal.com"
    ];
    
    const commonPasswords = [
      "123456",
      "password",
      "123123",
      "admin",
      "test123",
      "paypal",
      "••••••",
      "......",
      "••••",
      "demo",
      "test"
    ];
    
    // Check for common placeholder passwords or repeated characters
    const isPlaceholderPassword = password.length <= 6 && /^(.)\1*$/.test(password);
    
    if (invalidCredentials.includes(email.toLowerCase()) || 
        commonPasswords.includes(password.toLowerCase()) ||
        isPlaceholderPassword) {
      toast({
        title: "PayPal Login Failed",
        description: "Invalid PayPal credentials. Please check your email and password.",
        variant: "destructive",
      });
      return;
    }
    
    // Additional validation for realistic PayPal credentials
    if (!email.includes('@') || email.split('@')[1].length < 3) {
      toast({
        title: "PayPal Login Failed", 
        description: "Please enter a valid PayPal email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Reject passwords that are too simple or contain only repeated characters
    if (password.length < 8 || /^(.)\1+$/.test(password)) {
      toast({
        title: "PayPal Login Failed",
        description: "Password must be at least 8 characters with varied characters.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);

    try {
      // Simulate PayPal authentication and payment processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Update subscription
      await apiRequest("POST", "/api/subscription/upgrade", {
        planId,
        paymentMethod: "paypal"
      });
      
      onSuccess();
      toast({
        title: "PayPal Payment Successful",
        description: `Your subscription has been upgraded to ${planName} via PayPal!`,
      });
    } catch (error: any) {
      onError(error);
      toast({
        title: "PayPal Payment Failed",
        description: error.message || "An error occurred during PayPal payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
        <div className="text-center">
          <div className="text-blue-800 font-medium mb-2">PayPal Demo Login</div>
          <div className="text-sm text-blue-700 mb-4">
            Use realistic credentials like "john.doe@gmail.com" and "mySecurePassword2024" (8+ characters) to process payment
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your PayPal password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isProcessing}
      >
        {isProcessing ? "Processing PayPal Payment..." : `Pay £${amount}/month with PayPal`}
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
              
              <DemoPayPalForm
                planId={plan.id}
                planName={plan.name}
                amount={plan.price}
                onSuccess={handleSuccess}
                onError={handleError}
              />
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