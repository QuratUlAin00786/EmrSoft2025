import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  type: 'invoice_id' | 'patient_id' | 'patient_name';
  value: string;
  display: string;
  searchValue: string;
}

interface SearchComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function SearchComboBox({
  value,
  onValueChange,
  placeholder = "Search...",
  className = "",
  testId = "search-combobox"
}: SearchComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setOpen(value.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Fetch suggestions from API
  const { data: suggestions = [], isLoading } = useQuery<SearchSuggestion[]>({
    queryKey: ['/api/billing/search-suggestions', debouncedValue],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      
      const response = await fetch(
        `/api/billing/search-suggestions?query=${encodeURIComponent(debouncedValue)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': subdomain,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search suggestions');
      }
      
      return response.json();
    },
    enabled: debouncedValue.length > 0,
    staleTime: 30000,
  });

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Handle clicks outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        popoverRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation and auto-complete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== 'Escape') {
      setOpen(true);
      return;
    }

    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex].searchValue);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(value.length > 0)}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-testid={testId}
      />
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 w-80 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none animate-in"
        >
          <Command>
            {isLoading && (
              <div className="p-4 text-sm text-gray-500">Loading suggestions...</div>
            )}
            {!isLoading && debouncedValue.length > 0 && suggestions.length === 0 && (
              <CommandEmpty>No results found. You can type any search term.</CommandEmpty>
            )}
            {!isLoading && suggestions.length > 0 && (
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.type}-${suggestion.value}`}
                    value={suggestion.searchValue}
                    onSelect={() => handleSelect(suggestion.searchValue)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      highlightedIndex === index && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion.searchValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{suggestion.display}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </Command>
        </div>
      )}
    </div>
  );
}
