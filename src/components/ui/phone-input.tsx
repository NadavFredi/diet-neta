import * as React from "react"
import PhoneInputLib from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from "libphonenumber-js"

/**
 * Phone Number Utilities
 * 
 * Comprehensive phone number formatting and validation utilities
 * Handles all formats including +1 (USA), +972 (Israel), and other countries
 */

/**
 * Format phone number for Green API (remove +, 0, spaces, hyphens)
 * Expected format: 972XXXXXXXXX or 1XXXXXXXXXX (country code + number without + or 0)
 * Supports USA (+1), Israel (+972), and all other countries
 */
export const formatPhoneNumberForGreenAPI = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle Israeli numbers (if starts with 0, replace with 972)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '972' + cleaned.substring(1);
  }
  
  // Handle USA/Canada numbers starting with 1
  // If starts with 1 and has 11 digits total, it's already formatted correctly
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return cleaned; // Already in correct format: 1XXXXXXXXXX
  }
  
  // Handle USA numbers without country code (10 digits)
  // If 10 digits and doesn't start with country code, assume USA
  if (cleaned.length === 10 && !cleaned.startsWith('1') && !cleaned.startsWith('972')) {
    cleaned = '1' + cleaned; // Add USA country code
  }
  
  // Handle Israeli numbers without country code (9 digits)
  // If 9 digits and doesn't start with country code, assume Israel
  if (cleaned.length === 9 && !cleaned.startsWith('972') && !cleaned.startsWith('1')) {
    cleaned = '972' + cleaned;
  }
  
  // If number already starts with country code (972, 1, etc.), return as is
  if (cleaned.startsWith('972') || cleaned.startsWith('1') || cleaned.length > 11) {
    return cleaned;
  }
  
  return cleaned;
};

/**
 * Format phone number for WhatsApp link
 * Expected format: 972XXXXXXXXX or 1XXXXXXXXXX (country code + number without +)
 */
export const formatPhoneNumberForWhatsApp = (phone: string): string => {
  return formatPhoneNumberForGreenAPI(phone);
};

/**
 * Normalize phone number for comparison (remove spaces, dashes, parentheses, country codes)
 * Returns only the local number part for comparison purposes
 */
export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading country codes
  // Remove 972 (Israel) if present
  if (cleaned.startsWith('972') && cleaned.length > 9) {
    cleaned = cleaned.substring(3);
  }
  // Remove 1 (USA/Canada) if present and length is 11
  else if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

/**
 * Parse phone number and extract country code
 * Returns { countryCode: string, localNumber: string, fullNumber: string }
 */
export const parsePhoneNumberParts = (phone: string): {
  countryCode: string | null;
  localNumber: string;
  fullNumber: string;
} => {
  if (!phone) {
    return { countryCode: null, localNumber: '', fullNumber: '' };
  }
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const hasPlus = cleaned.startsWith('+');
  
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }
  
  // Try to detect country code
  // Israel: 972
  if (cleaned.startsWith('972') && cleaned.length >= 12) {
    return {
      countryCode: '972',
      localNumber: cleaned.substring(3),
      fullNumber: hasPlus ? `+${cleaned}` : cleaned
    };
  }
  
  // USA/Canada: 1
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return {
      countryCode: '1',
      localNumber: cleaned.substring(1),
      fullNumber: hasPlus ? `+${cleaned}` : cleaned
    };
  }
  
  // Try to parse with libphonenumber-js for other countries
  try {
    const parsed = parsePhoneNumber(phone);
    return {
      countryCode: parsed.countryCallingCode || null,
      localNumber: parsed.nationalNumber || cleaned,
      fullNumber: parsed.number || phone
    };
  } catch {
    // Fallback: treat as local number
    return {
      countryCode: null,
      localNumber: cleaned,
      fullNumber: hasPlus ? `+${cleaned}` : cleaned
    };
  }
};

/**
 * Format phone number for display
 * Formats as: +972 XX-XXX-XXXX or +1 (XXX) XXX-XXXX
 */
export const formatPhoneNumberForDisplay = (phone: string, countryCode?: string): string => {
  if (!phone) return '';
  
  try {
    const parsed = parsePhoneNumber(phone, countryCode as CountryCode);
    return parsed.formatInternational();
  } catch {
    // Fallback formatting
    const parts = parsePhoneNumberParts(phone);
    if (parts.countryCode === '972' && parts.localNumber.length === 9) {
      // Israeli format: +972 XX-XXX-XXXX
      const formatted = parts.localNumber.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
      return `+972 ${formatted}`;
    } else if (parts.countryCode === '1' && parts.localNumber.length === 10) {
      // USA format: +1 (XXX) XXX-XXXX
      const formatted = parts.localNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      return `+1 ${formatted}`;
    }
    return phone;
  }
};

/**
 * Validate phone number format
 * Returns { isValid: boolean, error?: string, formatted?: string }
 */
export const validatePhoneNumberFormat = (
  phone: string, 
  countryCode?: string
): { isValid: boolean; error?: string; formatted?: string } => {
  if (!phone) {
    return { isValid: false, error: 'מספר טלפון נדרש' };
  }
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Must start with +
  if (!cleaned.startsWith('+')) {
    return { isValid: false, error: 'מספר טלפון חייב להתחיל עם קוד מדינה' };
  }
  
  // Remove the + for length checking
  const digitsOnly = cleaned.substring(1);
  
  // Basic length check - international numbers should be at least 7 digits
  if (digitsOnly.length < 7) {
    return { isValid: false, error: 'מספר טלפון קצר מדי' };
  }
  
  // For Israeli numbers specifically, check format
  if (cleaned.startsWith('+972')) {
    const israeliNumber = digitsOnly.substring(3); // Remove 972
    // Israeli mobile numbers: 9 digits starting with 5
    // Israeli landline: 8-9 digits starting with 0, 2, 3, 4, 7, 8, 9
    if (israeliNumber.length === 9) {
      // Mobile number (starts with 5)
      if (israeliNumber.startsWith('5')) {
        // Valid Israeli mobile
      } else if (israeliNumber.startsWith('0') && ['2', '3', '4', '7', '8', '9'].includes(israeliNumber[1])) {
        // Valid Israeli landline with leading 0
      } else {
        // Might be valid, let libphonenumber-js decide
      }
    } else if (israeliNumber.length === 8) {
      // Landline without leading 0
      if (!['2', '3', '4', '7', '8', '9'].includes(israeliNumber[0])) {
        return { isValid: false, error: 'מספר טלפון לא תקין' };
      }
    } else if (israeliNumber.length < 8) {
      return { isValid: false, error: 'מספר טלפון קצר מדי' };
    }
  }
  
  try {
    const country = (countryCode || 'il') as CountryCode;
    
    // Try to validate with the country code
    let isValid = isValidPhoneNumber(cleaned, country);
    
    if (!isValid) {
      // Try without country code constraint (for international numbers)
      isValid = isValidPhoneNumber(cleaned);
    }
    
    if (!isValid) {
      // For Israeli numbers, be more lenient during typing
      if (cleaned.startsWith('+972')) {
        const israeliNumber = digitsOnly.substring(3);
        // If it's 8-9 digits, it might be valid (user might still be typing)
        if (israeliNumber.length >= 8 && israeliNumber.length <= 9) {
          // Check if it looks like a valid Israeli number
          const firstDigit = israeliNumber[0];
          if (firstDigit === '5' || firstDigit === '0' || ['2', '3', '4', '7', '8', '9'].includes(firstDigit)) {
            // Looks valid, try parsing
            try {
              const parsed = parsePhoneNumber(cleaned, country);
              if (parsed.isValid()) {
                return {
                  isValid: true,
                  formatted: parsed.number
                };
              }
            } catch {
              // Continue to error
            }
          }
        }
      }
      return { isValid: false, error: 'מספר טלפון לא תקין' };
    }
    
    // Get formatted version
    const parsed = parsePhoneNumber(cleaned, country);
    return {
      isValid: true,
      formatted: parsed.number
    };
  } catch (error) {
    // If parsing fails, check if it's a valid length for the country
    if (cleaned.startsWith('+972') && digitsOnly.length >= 11 && digitsOnly.length <= 12) {
      // Israeli number with reasonable length, might be valid
      return { isValid: true, formatted: cleaned };
    }
    return { isValid: false, error: 'מספר טלפון לא תקין' };
  }
};

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  onValidationChange?: (isValid: boolean) => void
  defaultCountry?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  showValidation?: boolean
  onEnter?: () => void
  autoFocus?: boolean
}

interface CountryData {
  name: string
  dialCode: string
  countryCode: string
  flag: string
}

// Common countries list (can be expanded)
const COMMON_COUNTRIES: CountryData[] = [
  { name: "Israel", dialCode: "972", countryCode: "il", flag: "🇮🇱" },
  { name: "United States", dialCode: "1", countryCode: "us", flag: "🇺🇸" },
  { name: "United Kingdom", dialCode: "44", countryCode: "gb", flag: "🇬🇧" },
  { name: "Canada", dialCode: "1", countryCode: "ca", flag: "🇨🇦" },
  { name: "Australia", dialCode: "61", countryCode: "au", flag: "🇦🇺" },
  { name: "Germany", dialCode: "49", countryCode: "de", flag: "🇩🇪" },
  { name: "France", dialCode: "33", countryCode: "fr", flag: "🇫🇷" },
  { name: "Italy", dialCode: "39", countryCode: "it", flag: "🇮🇹" },
  { name: "Spain", dialCode: "34", countryCode: "es", flag: "🇪🇸" },
  { name: "Netherlands", dialCode: "31", countryCode: "nl", flag: "🇳🇱" },
  { name: "Belgium", dialCode: "32", countryCode: "be", flag: "🇧🇪" },
  { name: "Switzerland", dialCode: "41", countryCode: "ch", flag: "🇨🇭" },
  { name: "Austria", dialCode: "43", countryCode: "at", flag: "🇦🇹" },
  { name: "Sweden", dialCode: "46", countryCode: "se", flag: "🇸🇪" },
  { name: "Norway", dialCode: "47", countryCode: "no", flag: "🇳🇴" },
  { name: "Denmark", dialCode: "45", countryCode: "dk", flag: "🇩🇰" },
  { name: "Finland", dialCode: "358", countryCode: "fi", flag: "🇫🇮" },
  { name: "Poland", dialCode: "48", countryCode: "pl", flag: "🇵🇱" },
  { name: "Russia", dialCode: "7", countryCode: "ru", flag: "🇷🇺" },
  { name: "China", dialCode: "86", countryCode: "cn", flag: "🇨🇳" },
  { name: "Japan", dialCode: "81", countryCode: "jp", flag: "🇯🇵" },
  { name: "South Korea", dialCode: "82", countryCode: "kr", flag: "🇰🇷" },
  { name: "India", dialCode: "91", countryCode: "in", flag: "🇮🇳" },
  { name: "Brazil", dialCode: "55", countryCode: "br", flag: "🇧🇷" },
  { name: "Mexico", dialCode: "52", countryCode: "mx", flag: "🇲🇽" },
  { name: "Argentina", dialCode: "54", countryCode: "ar", flag: "🇦🇷" },
  { name: "South Africa", dialCode: "27", countryCode: "za", flag: "🇿🇦" },
  { name: "Turkey", dialCode: "90", countryCode: "tr", flag: "🇹🇷" },
  { name: "Saudi Arabia", dialCode: "966", countryCode: "sa", flag: "🇸🇦" },
  { name: "United Arab Emirates", dialCode: "971", countryCode: "ae", flag: "🇦🇪" },
]

export const PhoneInput = ({
  value,
  onChange,
  onValidationChange,
  defaultCountry = "il",
  placeholder = "Phone number",
  disabled,
  className,
  id,
  showValidation = true,
  onEnter,
  autoFocus = false
}: PhoneInputProps) => {
  const [selectedCountry, setSelectedCountry] = React.useState<CountryData | null>(null)
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const hiddenPhoneInputRef = React.useRef<any>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [allCountries, setAllCountries] = React.useState<CountryData[]>(COMMON_COUNTRIES)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const countriesListRef = React.useRef<HTMLDivElement>(null)
  const countryButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [isValid, setIsValid] = React.useState<boolean | null>(null)
  const [validationError, setValidationError] = React.useState<string>("")

  // Try to get all countries from the library
  React.useEffect(() => {
    if (hiddenPhoneInputRef.current) {
      try {
        const phoneInputLib = hiddenPhoneInputRef.current
        // Access countries from library instance
        const libCountries = (phoneInputLib as any).countries || (phoneInputLib as any).countryList || []
        if (libCountries.length > 0) {
          const formattedCountries = libCountries.map((c: any) => ({
            name: c.name,
            dialCode: c.dialCode,
            countryCode: c.countryCode || c.iso2,
            flag: c.flag || c.flagEmoji || ""
          }))
          setAllCountries(formattedCountries)
        }
      } catch (error) {
        // Use common countries as fallback
        console.log("Using common countries list")
      }
    }
  }, [])

  // Filter countries by search query
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return allCountries.slice(0, 50) // Show first 50 by default

    const query = searchQuery.toLowerCase()
    return allCountries.filter((country) =>
      country.name.toLowerCase().includes(query) ||
      country.dialCode.includes(query) ||
      country.countryCode.toLowerCase().includes(query)
    ).slice(0, 50)
  }, [allCountries, searchQuery])

  // Reset highlighted index when filtered countries change
  React.useEffect(() => {
    if (isPopoverOpen) {
      // Highlight selected country if it's in the filtered list, otherwise highlight first item
      const selectedIndex = filteredCountries.findIndex(
        c => c.countryCode === selectedCountry?.countryCode
      )
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    } else {
      setHighlightedIndex(-1)
    }
  }, [filteredCountries, searchQuery, isPopoverOpen, selectedCountry])

  // Validate phone number using centralized utility
  const validatePhoneNumber = React.useCallback((fullNumber: string, countryCode?: string): { isValid: boolean; error?: string } => {
    if (!fullNumber || !fullNumber.startsWith("+")) {
      return { isValid: false, error: "מספר טלפון לא תקין" }
    }

    const validation = validatePhoneNumberFormat(
      fullNumber, 
      countryCode || selectedCountry?.countryCode || defaultCountry
    );
    
    return {
      isValid: validation.isValid,
      error: validation.error
    };
  }, [selectedCountry, defaultCountry])

  // Initialize selected country from value or default
  React.useEffect(() => {
    if (value) {
      // Use centralized parsing utility
      const parts = parsePhoneNumberParts(value);
      let countryFound = false;

      // Try to find country by country code
      if (parts.countryCode) {
        const country = allCountries.find(
          c => c.dialCode === parts.countryCode || 
               (parts.countryCode === '1' && (c.dialCode === '1' && (c.countryCode === 'us' || c.countryCode === 'ca')))
        );
        
        if (country) {
          setSelectedCountry(country);
          setPhoneNumber(parts.localNumber);
          countryFound = true;
        } else {
          // Try to match by dial code
          for (const country of allCountries) {
            if (parts.countryCode === country.dialCode) {
              setSelectedCountry(country);
              setPhoneNumber(parts.localNumber);
              countryFound = true;
              break;
            }
          }
        }
      }

      // If no country found, try to detect from full number
      if (!countryFound) {
        const cleanValue = value.replace(/^\+/, "");
        
        // Try to detect country from dial code (prioritize longer codes first)
        const sortedCountries = [...allCountries].sort((a, b) => b.dialCode.length - a.dialCode.length);
        
        for (const country of sortedCountries) {
          if (cleanValue.startsWith(country.dialCode)) {
            setSelectedCountry(country);
            // Extract phone number
            const phone = cleanValue.substring(country.dialCode.length);
            setPhoneNumber(phone);
            countryFound = true;
            break;
          }
        }
      }

      // If still no country found, use default country and treat value as local number
      if (!countryFound) {
        const defaultCountryData = allCountries.find(c => c.countryCode === defaultCountry);
        if (defaultCountryData) {
          setSelectedCountry(defaultCountryData);
          // Treat the entire value as the local phone number (remove + if present)
          const cleanValue = value.replace(/^\+/, "");
          setPhoneNumber(cleanValue);
        }
      }

      // Validate will be handled in a separate effect after state updates
    } else {
      // Initialize with default country
      const defaultCountryData = allCountries.find(c => c.countryCode === defaultCountry);
      if (defaultCountryData) {
        setSelectedCountry(defaultCountryData);
      }
      setPhoneNumber("");
      setIsValid(null);
      setValidationError("");
      onValidationChange?.(true); // Empty is valid
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, defaultCountry, allCountries, showValidation, onValidationChange])

  // Separate effect to validate after phoneNumber and selectedCountry are set
  React.useEffect(() => {
    if (value && phoneNumber && selectedCountry && showValidation) {
      const fullNumber = value.startsWith('+') ? value : `+${selectedCountry.dialCode}${phoneNumber}`;
      const validation = validatePhoneNumber(fullNumber, selectedCountry.countryCode);
      setIsValid(validation.isValid);
      setValidationError(validation.error || "");
      onValidationChange?.(validation.isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, selectedCountry, value, showValidation])

  // Handle country selection
  const handleCountrySelect = React.useCallback((country: CountryData) => {
    setSelectedCountry(country)
    setIsPopoverOpen(false)
    setSearchQuery("")

    // Update phone value with new country if phone number exists
    if (phoneNumber) {
      const newValue = `+${country.dialCode}${phoneNumber}`
      onChange?.(newValue)

      // Re-validate with new country
      if (showValidation && phoneNumber.length > 0) {
        const validation = validatePhoneNumber(newValue, country.countryCode)
        setIsValid(validation.isValid)
        setValidationError(validation.error || "")
        onValidationChange?.(validation.isValid)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, onChange, showValidation, onValidationChange])

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && countryButtonRefs.current[highlightedIndex]) {
      countryButtonRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      })
    }
  }, [highlightedIndex])

  // Handle keyboard navigation for search input
  const handleSearchKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPopoverOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex((prev) => {
          const next = prev < filteredCountries.length - 1 ? prev + 1 : 0
          return next
        })
        // Focus first country button
        if (countryButtonRefs.current[0]) {
          countryButtonRefs.current[0]?.focus()
        }
        break
      case "Escape":
        e.preventDefault()
        setIsPopoverOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }, [isPopoverOpen, filteredCountries])

  // Handle keyboard navigation for country list
  const handleListKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!isPopoverOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev < filteredCountries.length - 1 ? prev + 1 : 0
          return next
        })
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredCountries.length - 1
          return next
        })
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleCountrySelect(filteredCountries[highlightedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setIsPopoverOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }, [isPopoverOpen, highlightedIndex, filteredCountries, handleCountrySelect])

  // Handle phone number change
  const handlePhoneChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value.replace(/\D/g, "") // Only digits
    setPhoneNumber(newPhoneNumber)

    // Combine with country code
    if (selectedCountry && newPhoneNumber) {
      const fullNumber = `+${selectedCountry.dialCode}${newPhoneNumber}`
      onChange?.(fullNumber)

      // Validate if showValidation is enabled
      if (showValidation && newPhoneNumber.length > 0) {
        const validation = validatePhoneNumber(fullNumber)
        setIsValid(validation.isValid)
        setValidationError(validation.error || "")
        onValidationChange?.(validation.isValid)
      } else {
        setIsValid(null)
        setValidationError("")
        onValidationChange?.(true) // Don't block if validation is disabled
      }
    } else if (!newPhoneNumber) {
      onChange?.("")
      setIsValid(null)
      setValidationError("")
      onValidationChange?.(true) // Empty is considered valid (optional field)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, onChange, showValidation, onValidationChange])

  return (
    <div className={cn("relative flex gap-0", className)} dir="ltr">
      {/* Hidden phone input for library initialization */}
      <div className="absolute opacity-0 pointer-events-none -z-10 w-0 h-0 overflow-hidden">
        <PhoneInputLib
          ref={hiddenPhoneInputRef}
          country={selectedCountry?.countryCode || defaultCountry}
          value=""
          onChange={() => { }}
          disabled={true}
          inputProps={{ style: { display: 'none' } }}
        />
      </div>

      {/* Country Code Input with Flag */}
      <Popover open={isPopoverOpen} onOpenChange={(open) => {
        setIsPopoverOpen(open)
        if (!open) {
          setHighlightedIndex(-1)
          setSearchQuery("")
        }
      }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 items-center gap-2 rounded-l-md border border-r-0 border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:bg-accent transition-colors",
              "min-w-[120px]"
            )}
          >
            {selectedCountry ? (
              <>
                <span className="text-lg leading-none">{selectedCountry.flag}</span>
                <span className="text-muted-foreground font-medium">+{selectedCountry.dialCode}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
        >
          {/* Search input */}
          <div className="p-2 border-b">
            <Input
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-8"
              dir="ltr"
              autoFocus
            />
          </div>

          {/* Countries list */}
          <div
            ref={countriesListRef}
            className="max-h-60 overflow-auto"
            onKeyDown={handleListKeyDown}
            tabIndex={0}
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <button
                  key={country.countryCode}
                  ref={(el) => {
                    countryButtonRefs.current[index] = el
                  }}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm text-left",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    selectedCountry?.countryCode === country.countryCode && "bg-accent/50",
                    highlightedIndex === index && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-muted-foreground">+{country.dialCode}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No countries found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Phone Number Input */}
      <div className="flex-1 flex flex-col">
        <Input
          id={id}
          type="tel"
          placeholder={placeholder}
          value={phoneNumber}
          onChange={handlePhoneChange}
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault()
              onEnter()
            }
          }}
          disabled={disabled}
          className={cn(
            "rounded-l-none border-l-0 text-left placeholder:text-right",
            showValidation && isValid === false && "border-red-500 focus-visible:ring-0 focus-visible:ring-offset-0",
            showValidation && isValid === true && "focus-visible:border-green-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
        />
        {showValidation && isValid === false && validationError && (
          <p className="text-xs text-red-500 mt-1 text-right" dir="rtl">
            {validationError}
          </p>
        )}
      </div>
    </div>
  )
}
