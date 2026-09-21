import { LayoutDashboard, FileText, XCircle, Tag, Wallet } from "lucide-react";

type PartnerTabType = "overview" | "properties" | "rejected" | "sold" | "add-property" | "wallet";

interface PartnerTabItem {
  id: PartnerTabType;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

interface PartnerMobileTabBarProps {
  activeTab: PartnerTabType;
  onTabChange: (tab: PartnerTabType) => void;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    sold: number;
  };
}

export const PartnerMobileTabBar = ({ activeTab, onTabChange, stats }: PartnerMobileTabBarProps) => {
  const tabs: PartnerTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "properties",
      label: "Properties",
      icon: FileText,
      count: stats.total,
    },
    {
      id: "rejected",
      label: "Rejected",
      icon: XCircle,
      count: stats.rejected,
    },
    {
      id: "sold",
      label: "Sold",
      icon: Tag,
      count: stats.sold,
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: Wallet,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-card/80 backdrop-blur-sm border-t border-glass-border shadow-lg">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all relative ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/20 text-primary"
                  }`}>
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

