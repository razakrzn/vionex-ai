import { LayoutDashboard, FileText, XCircle, Tag, Wallet } from "lucide-react";

type PartnerTabType = "overview" | "properties" | "rejected" | "sold" | "add-property" | "wallet";

interface PartnerTabItem {
  id: PartnerTabType;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

interface PartnerSidebarProps {
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

export const PartnerSidebar = ({ activeTab, onTabChange, stats }: PartnerSidebarProps) => {
  const tabs: PartnerTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "properties",
      label: "My Properties",
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
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-glass-border bg-white dark:bg-card/50 backdrop-blur-sm hidden lg:block overflow-y-auto shadow-sm">
      <nav className="p-4 space-y-2">
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

