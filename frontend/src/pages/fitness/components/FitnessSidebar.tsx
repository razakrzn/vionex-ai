import { LayoutDashboard, Dumbbell } from "lucide-react";

type FitnessTabType = "overview" | "gyms";

interface FitnessTabItem {
  id: FitnessTabType;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FitnessSidebarProps {
  activeTab: FitnessTabType;
  onTabChange: (tab: FitnessTabType) => void;
  stats: {
    totalGyms: number;
    approvedGyms: number;
    pendingGyms: number;
    rejectedGyms: number;
  };
  isApproved?: boolean;
  onAddGym?: () => void;
}

export const FitnessSidebar = ({ activeTab, onTabChange, stats, isApproved = false, onAddGym }: FitnessSidebarProps) => {
  const tabs: FitnessTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "gyms",
      label: "My Gyms",
      icon: Dumbbell,
      count: stats.totalGyms,
    },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-glass-border bg-white dark:bg-card/50 backdrop-blur-sm hidden lg:block overflow-y-auto shadow-sm">
      <nav className="p-4 space-y-2">
        {isApproved && (
          <Button
            variant="default"
            className="w-full mb-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onAddGym}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Gym
          </Button>
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-muted/50 dark:hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium flex-1 text-left">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-primary-foreground/20 dark:text-primary-foreground"
                      : "bg-primary/10 text-primary dark:bg-muted dark:text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

