import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/context/currency-context";
import { getSupportedCurrencies } from "@/utils/currency";

export function CurrencySelector() {
  const { currency, symbol, setCurrency, isLoading } = useCurrency();
  const currencies = getSupportedCurrencies();

  // Group currencies by region for better organization
  const popularCurrencies = currencies.filter(c => 
    ["GBP", "USD", "EUR", "JPY", "INR", "AUD", "CAD", "PKR"].includes(c.code)
  );
  const otherCurrencies = currencies.filter(c => 
    !["GBP", "USD", "EUR", "JPY", "INR", "AUD", "CAD", "PKR"].includes(c.code)
  );

  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      await setCurrency(newCurrency as any);
    } catch (error) {
      console.error("Failed to change currency:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
          disabled={isLoading}
          data-testid="currency-selector-trigger"
        >
          <DollarSign className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {symbol} {currency}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Select Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[400px] overflow-y-auto">
          {/* Popular Currencies */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Popular
            </p>
            {popularCurrencies.map((curr) => (
              <DropdownMenuItem
                key={curr.code}
                onClick={() => handleCurrencyChange(curr.code)}
                className={`cursor-pointer ${
                  currency === curr.code
                    ? "bg-primary/10 text-primary"
                    : ""
                }`}
                data-testid={`currency-option-${curr.code}`}
              >
                <span className="font-medium mr-2">{curr.symbol}</span>
                <span className="text-sm">
                  {curr.code} - {curr.name}
                </span>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator />

          {/* Other Currencies */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Other
            </p>
            {otherCurrencies.map((curr) => (
              <DropdownMenuItem
                key={curr.code}
                onClick={() => handleCurrencyChange(curr.code)}
                className={`cursor-pointer ${
                  currency === curr.code
                    ? "bg-primary/10 text-primary"
                    : ""
                }`}
                data-testid={`currency-option-${curr.code}`}
              >
                <span className="font-medium mr-2">{curr.symbol}</span>
                <span className="text-sm">
                  {curr.code} - {curr.name}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
