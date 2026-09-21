import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value?: Date | string;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  id,
  name,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Convert string to Date if needed
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) {
      // Check if date is valid
      return isNaN(value.getTime()) ? undefined : value;
    }
    if (typeof value === "string") {
      // Handle both "yyyy-MM-dd" and other formats
      const date = value.includes("T") ? new Date(value) : new Date(value + "T00:00:00");
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12",
            !dateValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          id={id}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? format(dateValue, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={dateValue}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          showFooter={true}
          onToday={() => {
            const today = new Date();
            onChange?.(today);
            setOpen(false);
          }}
          onClear={() => {
            onChange?.(undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
      {/* Hidden input for form submission */}
      {name && (
        <Input
          type="hidden"
          name={name}
          value={dateValue ? format(dateValue, "yyyy-MM-dd") : ""}
        />
      )}
    </Popover>
  );
}

