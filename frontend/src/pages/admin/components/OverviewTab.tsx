import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TabType } from "../types";

interface OverviewTabProps {
  userSeries: Array<{ date: string; total: number }>;
  subscribedOwnerSeries: Array<{ role: string; value: number; color: string }>;
  propertySeries: Array<{ date: string; total: number }>;
  leadsSeries: Array<{ date: string; leads: number }>;
  isLoadingCharts: boolean;
  setActiveTab: (tab: TabType) => void;
}

export const OverviewTab = ({
  userSeries,
  subscribedOwnerSeries,
  propertySeries,
  leadsSeries,
  isLoadingCharts,
  setActiveTab,
}: OverviewTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Users"
          description="Active today, last 30 days, total users"
          isLoading={isLoadingCharts}
        >
          {userSeries.length ? (
            <ChartContainer config={{ total: { label: "New Users", color: "hsl(var(--primary))" } }} className="h-[260px]">
              <LineChart data={userSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
        <ChartCard
          title="Properties"
          description="Totals by status"
          isLoading={isLoadingCharts}
        >
          {propertySeries.length ? (
            <ChartContainer config={{ total: { label: "Listings", color: "hsl(var(--primary))" } }} className="h-[260px]">
              <BarChart data={propertySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--color-total)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Owners"
          description="Owners vs gym owners"
          isLoading={isLoadingCharts}
          actionLabel="Manage Users"
          onAction={() => setActiveTab("users")}
        >
          {subscribedOwnerSeries.length ? (
            <ChartContainer config={{ value: { label: "Subscribed", color: "hsl(var(--primary))" } }} className="h-[260px]">
              <BarChart data={subscribedOwnerSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {subscribedOwnerSeries.map((entry) => (
                    <Cell key={entry.role} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
        <ChartCard
          title="Payments"
          description="Total, pending, completed, failed"
          isLoading={isLoadingCharts}
          actionLabel="Manage Leads"
          onAction={() => setActiveTab("leads")}
        >
          {leadsSeries.length ? (
            <ChartContainer config={{ leads: { label: "Leads", color: "hsl(var(--primary))" } }} className="h-[260px]">
              <LineChart data={leadsSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="leads" stroke="var(--color-leads)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
      </div>
    </div>
  );
};
  
const ChartCard = ({
  title,
  description,
  isLoading,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  isLoading: boolean;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) => (
  <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="text-xs font-semibold text-primary hover:text-primary/80">
          {actionLabel}
        </button>
      ) : null}
    </div>
    {isLoading ? <div className="h-[260px] rounded-lg bg-muted/40 animate-pulse" /> : children}
  </div>
);

const EmptyChartState = () => (
  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
    No data available yet.
  </div>
);