import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClear?: () => void;
  onToday?: () => void;
  showFooter?: boolean;
};

function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  onClear,
  onToday,
  showFooter = true,
  selected,
  onSelect,
  ...props 
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(selected instanceof Date ? selected : new Date());
  const handleToday = () => {
    const today = new Date();
    if (onSelect) {
      onSelect(today);
    }
    if (onToday) {
      onToday();
    }
  };

  const handleClear = () => {
    if (onSelect) {
      onSelect(undefined);
    }
    if (onClear) {
      onClear();
    }
  };

  // Update month when selected date changes
  React.useEffect(() => {
    if (selected instanceof Date) {
      setMonth(selected);
    }
  }, [selected]);

  // Generate years for dropdown (current year ± 50 years)
  const currentYear = new Date().getFullYear();

  return (
    <div className={cn("rounded-lg border border-border bg-popover shadow-sm overflow-hidden", className)}>
      <DayPicker
        mode="single"
        showOutsideDays={showOutsideDays}
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
        captionLayout="dropdown-buttons"
        fromYear={currentYear - 50}
        toYear={currentYear + 50}
        className={cn("p-4", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex items-center justify-center gap-2 pt-1 pb-3 px-1 relative",
          caption_label: "sr-only",
          caption_dropdowns: "flex items-center gap-2",
          dropdown: "text-sm font-medium bg-muted/50 border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors cursor-pointer appearance-none pr-8",
          dropdown_month: "text-sm font-medium bg-muted/50 border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors cursor-pointer appearance-none pr-8",
          dropdown_year: "text-sm font-medium bg-muted/50 border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors cursor-pointer appearance-none pr-8",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex mb-2",
          head_cell: "text-muted-foreground w-9 h-9 font-normal text-xs flex items-center justify-center",
          row: "flex w-full mt-1",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 cursor-pointer"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
          Dropdown: ({ name, value, onChange, children, ...props }) => {
            return (
              <div className="relative">
                <select
                  {...props}
                  value={value}
                  onChange={onChange}
                  className="appearance-none bg-muted/50 border border-border rounded-md px-2 py-1 pr-8 text-sm font-medium cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {children}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
              </div>
            );
          },
        }}
        {...props}
      />
      {showFooter && (onClear || onToday) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 text-sm font-medium"
            >
              Clear
            </Button>
          )}
          {onToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 text-sm font-medium ml-auto"
            >
              Today
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
