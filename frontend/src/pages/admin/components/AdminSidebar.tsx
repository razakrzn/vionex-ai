import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TabType, TabItem } from "../types";

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: TabItem[];
}

export const AdminSidebar = ({ activeTab, onTabChange, tabs }: AdminSidebarProps) => {
  const [expandedTabs, setExpandedTabs] = useState<Set<TabType>>(new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<TabType>>(new Set());

  // Clear manually collapsed state when a child becomes active
  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.children) {
        const hasActiveChild = tab.children.some((child) => activeTab === child.id);
        if (hasActiveChild && manuallyCollapsed.has(tab.id)) {
          // Clear manually collapsed state when child becomes active
          setManuallyCollapsed((prev) => {
            const next = new Set(prev);
            next.delete(tab.id);
            return next;
          });
          // Also ensure it's expanded
          setExpandedTabs((prev) => {
            const next = new Set(prev);
            next.add(tab.id);
            return next;
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const toggleExpand = (tabId: TabType) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
        // Track that user manually collapsed this tab
        setManuallyCollapsed((prevCollapsed) => {
          const nextCollapsed = new Set(prevCollapsed);
          nextCollapsed.add(tabId);
          return nextCollapsed;
        });
      } else {
        next.add(tabId);
        // Remove from manually collapsed if user expands it
        setManuallyCollapsed((prevCollapsed) => {
          const nextCollapsed = new Set(prevCollapsed);
          nextCollapsed.delete(tabId);
          return nextCollapsed;
        });
      }
      return next;
    });
  };

  const isExpanded = (tabId: TabType) => {
    // If user manually collapsed it, respect that
    if (manuallyCollapsed.has(tabId)) {
      return false;
    }
    
    // Auto-expand if it has active child
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && tab.children) {
      const hasActive = tab.children.some((child) => activeTab === child.id);
      if (hasActive) return true;
    }
    return expandedTabs.has(tabId);
  };

  const hasActiveChild = (tab: TabItem): boolean => {
    if (!tab.children) return false;
    return tab.children.some((child) => activeTab === child.id || hasActiveChild(child));
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-glass-border bg-card/50 backdrop-blur-sm hidden lg:block overflow-y-auto">
      <nav className="p-4 space-y-2">
        {tabs.map((tab) => {
          const hasChildren = tab.children && tab.children.length > 0;
          const isActive = activeTab === tab.id;
          const hasActive = hasActiveChild(tab);
          const expanded = isExpanded(tab.id);

          return (
            <div key={tab.id} className="space-y-1">
              <button
                onClick={() => {
                  if (hasChildren) {
                    // If has children, just toggle expand
                    toggleExpand(tab.id);
                  } else {
                    // If no children, navigate directly
                    onTabChange(tab.id);
                  }
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive || hasActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(tab.id);
                      }}
                      className="p-0.5 hover:bg-primary/20 rounded"
                    >
                      {expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive || hasActive ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
              
              {/* Sub-tabs */}
              {hasChildren && expanded && (
                <div className="ml-4 space-y-1 pl-4 border-l-2 border-glass-border">
                  {tab.children.map((child) => {
                    const isChildActive = activeTab === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onTabChange(child.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                          isChildActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        }`}
                      >
                        <span className="font-medium">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};