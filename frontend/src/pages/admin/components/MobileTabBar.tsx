import type { TabType, TabItem } from "../types";

interface MobileTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: TabItem[];
}

export const MobileTabBar = ({ activeTab, onTabChange, tabs }: MobileTabBarProps) => {
  // Flatten tabs including children for mobile view
  const flattenTabs = (tabs: TabItem[]): TabItem[] => {
    const result: TabItem[] = [];
    tabs.forEach((tab) => {
      result.push(tab);
      if (tab.children && tab.children.length > 0) {
        result.push(...tab.children);
      }
    });
    return result;
  };

  const allTabs = flattenTabs(tabs);

  return (
    <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-card/80 backdrop-blur-sm border-b border-glass-border overflow-x-auto scrollbar-hide">
      <div className="flex p-2 gap-2">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground"
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            <span className="text-sm">{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-xs bg-background/20 px-1.5 rounded">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};