import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type CurrencyCode, CURRENCY_MAP, ensureCurrencyCode } from "@/../../shared/currency";
import { useToast } from "@/hooks/use-toast";

interface CurrencyContextValue {
  currency: CurrencyCode;
  symbol: string;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { toast } = useToast();
  
  // Get initial currency from localStorage or default to GBP
  const getInitialCurrency = (): CurrencyCode => {
    const stored = localStorage.getItem("user_currency");
    return ensureCurrencyCode(stored);
  };

  const [currency, setCurrencyState] = useState<CurrencyCode>(getInitialCurrency());

  // Fetch organization data to get the authoritative currency
  const { data: organization } = useQuery({
    queryKey: ["/api/organization"],
  });

  // Update currency when organization data loads
  useEffect(() => {
    if (organization?.settings?.billing?.currency) {
      const orgCurrency = ensureCurrencyCode(organization.settings.billing.currency);
      setCurrencyState(orgCurrency);
      localStorage.setItem("user_currency", orgCurrency);
    }
  }, [organization]);

  // Mutation to update currency on backend
  const updateCurrencyMutation = useMutation({
    mutationFn: async (newCurrency: CurrencyCode) => {
      return await apiRequest(
        "PATCH",
        "/api/organization/settings",
        {
          settings: {
            billing: {
              currency: newCurrency,
            },
          },
        }
      );
    },
    onSuccess: () => {
      // Invalidate organization query to refetch with new currency
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({
        title: "Currency Updated",
        description: "Currency has been changed successfully.",
      });
    },
    onError: (error, _variables, context: any) => {
      // Rollback to previous currency on error
      if (context?.previousCurrency) {
        setCurrencyState(context.previousCurrency);
        localStorage.setItem("user_currency", context.previousCurrency);
      }
      console.error("Failed to update currency:", error);
      toast({
        title: "Error",
        description: "Failed to update currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const setCurrency = async (newCurrency: CurrencyCode) => {
    const previousCurrency = currency;
    
    // Update local state immediately for responsive UI
    setCurrencyState(newCurrency);
    localStorage.setItem("user_currency", newCurrency);

    // Update backend with rollback on error
    try {
      await updateCurrencyMutation.mutateAsync(newCurrency, {
        context: { previousCurrency },
      } as any);
    } catch (error) {
      // Rollback already handled in onError
    }
  };

  const value: CurrencyContextValue = {
    currency,
    symbol: CURRENCY_MAP[currency].symbol,
    setCurrency,
    isLoading: updateCurrencyMutation.isPending,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
