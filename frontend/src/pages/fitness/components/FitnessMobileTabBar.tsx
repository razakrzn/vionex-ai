import { LayoutDashboard, Dumbbell } from "lucide-react";

type FitnessTabType = "overview" | "gyms";

interface FitnessTabItem {
  id: FitnessTabType;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

interface FitnessMobileTabBarProps {
  activeTab: FitnessTabType;
  onTabChange: (tab: FitnessTabType) => void;
  stats: {
    totalGyms: number;
    approvedGyms: number;
    pendingGyms: number;
    rejectedGyms: number;
  };
}

export const FitnessMobileTabBar = ({ activeTab, onTabChange, stats }: FitnessMobileTabBarProps) => {
  const tabs: FitnessTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "gyms",
      label: "Gyms",
      icon: Dumbbell,
      count: stats.totalGyms,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-card border-t border-glass-border lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 flex-1 transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

