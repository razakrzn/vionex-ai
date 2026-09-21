import {
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Building2,
  Eye,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  BarChart3,
  Calendar,
  MapPin,
  DollarSign,
  Edit,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatCard } from "@/pages/admin/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PartnerProperty } from "@/services/partner/myspace";

interface PartnerOverviewTabProps {
  stats: {
    total: number;
    pending: number;
    approved: number;
  };
  properties: PartnerProperty[];
  onAddProperty: () => void;
  onViewProperties: () => void;
  onViewPending: () => void;
  onViewApproved: () => void;
  onEditProperty: (id: number) => void;
  isApproved?: boolean;
}

export const PartnerOverviewTab = ({
  stats,
  properties,
  onAddProperty,
  onViewProperties,
  onViewPending,
  onViewApproved,
  onEditProperty,
  isApproved = false,
}: PartnerOverviewTabProps) => {
  // Calculate additional metrics
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const avgViewsPerProperty = stats.approved > 0 ? Math.round(totalViews / stats.approved) : 0;
  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  
  // Get recent properties (last 5)
  const recentProperties = [...properties]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Get top performing properties (by views)
  const topProperties = [...properties]
    .filter((p) => p.is_approved && (p.views_count || 0) > 0)
    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    .slice(0, 3);

  const statusData = [
    {
      name: "Approved",
      value: stats.approved,
      color: "hsl(var(--primary))",
    },
    {
      name: "Pending",
      value: stats.pending,
      color: "hsl(45 100% 51%)",
    },
    {
      name: "Other",
      value: Math.max(stats.total - stats.approved - stats.pending, 0),
      color: "hsl(var(--muted-foreground))",
    },
  ].filter((item) => item.value > 0);

  const viewsData = [...properties]
    .filter((p) => (p.views_count || 0) > 0)
    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    .slice(0, 6)
    .map((p) => ({
      name: p.title.length > 18 ? `${p.title.slice(0, 18)}…` : p.title,
      views: p.views_count || 0,
    }));

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Welcome to Your Dashboard! 👋
            </h2>
            <p className="text-muted-foreground">
              Manage your properties, track performance, and grow your business.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-sm font-semibold text-primary">Partner Portal</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Properties"
          value={stats.total}
          icon={FileText}
          color="primary"
          onClick={onViewProperties}
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          color="yellow"
          onClick={onViewPending}
        />
        <StatCard
          title="Approved & Live"
          value={stats.approved}
          icon={CheckCircle2}
          color="green"
          onClick={onViewApproved}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Approval Rate</h3>
            </div>
            <span className="text-2xl font-bold text-green-500">{approvalRate}%</span>
          </div>
          <Progress value={approvalRate} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.approved} of {stats.total} properties approved
          </p>
        </div>

        {/* Avg Views card (hidden per request)
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Avg. Views</h3>
            </div>
            <span className="text-2xl font-bold text-primary">{avgViewsPerProperty}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Per approved property
          </p>
        </div>
        */}

        <div className="bg-card border border-glass-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Performance</h3>
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500/50">
              {stats.approved > 0 ? "Active" : "Getting Started"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.approved > 0 
              ? "Your properties are performing well!" 
              : "Add your first property to get started"}
          </p>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Views by Property
            </h3>
            <span className="text-sm text-muted-foreground">{totalViews.toLocaleString()} total</span>
          </div>
          {viewsData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No views data yet.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewsData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Listing Status
            </h3>
            <span className="text-sm text-muted-foreground">{stats.total} total</span>
          </div>
          {statusData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No listings yet.</div>
          ) : (
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                <span className="text-muted-foreground">
                  {entry.name}: <span className="text-foreground font-medium">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-glass-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Quick Actions</h3>
          <Button variant="ghost" size="sm" onClick={onViewProperties}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-${isApproved ? '3' : '2'} gap-4`}>
          {isApproved && (
            <Button
              variant="neon"
              size="lg"
              onClick={onAddProperty}
              className="w-full justify-start h-auto py-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Add New Property</div>
                  <div className="text-sm opacity-90">Create a new listing</div>
                </div>
              </div>
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={onViewPending}
            className="w-full justify-start h-auto py-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Pending Review</div>
                <div className="text-sm text-muted-foreground">{stats.pending} properties</div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onViewApproved}
            className="w-full justify-start h-auto py-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Live Properties</div>
                <div className="text-sm text-muted-foreground">{stats.approved} active</div>
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* Recent Properties & Top Performers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Recent Properties
            </h3>
            <Button variant="ghost" size="sm" onClick={onViewProperties}>
              View All
            </Button>
          </div>
          {recentProperties.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No properties yet</p>
              {isApproved && (
                <Button variant="outline" size="sm" onClick={onAddProperty} className="mt-4">
                  Add Your First Property
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-glass-border hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => onEditProperty(property.id)}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {property.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          property.is_approved
                            ? "text-green-500 border-green-500/50 bg-green-500/10 text-xs"
                            : "text-yellow-500 border-yellow-500/50 bg-yellow-500/10 text-xs"
                        }
                      >
                        {property.is_approved ? "Live" : "Pending"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(property.created_at)}
                      </span>
                    </div>
                  </div>
                  <Edit className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Properties */}
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Top Performers
            </h3>
            <Badge variant="outline" className="text-primary">
              By Views
            </Badge>
          </div>
          {topProperties.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No views yet</p>
              <p className="text-xs text-muted-foreground">
                Approved properties will appear here once they receive views
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProperties.map((property, index) => (
                <div
                  key={property.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-glass-border hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => onEditProperty(property.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {property.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {(property.views_count || 0).toLocaleString()} views
                      </span>
                    </div>
                  </div>
                  <Edit className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tips & Guidelines */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Tips for Better Listings
          </h3>
          <ul className="space-y-3">
            <TipItem
              icon={CheckCircle2}
              text="Use high-quality images (at least 3 photos)"
              color="green"
            />
            <TipItem
              icon={CheckCircle2}
              text="Write detailed descriptions with key features"
              color="green"
            />
            <TipItem
              icon={CheckCircle2}
              text="Set competitive pricing based on market rates"
              color="green"
            />
            <TipItem
              icon={CheckCircle2}
              text="Update property information regularly"
              color="green"
            />
            <TipItem
              icon={CheckCircle2}
              text="Respond quickly to inquiries for better engagement"
              color="green"
            />
          </ul>
        </div>

        <div className="bg-card border border-glass-border rounded-xl p-6">
          <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Property Status Guide
          </h3>
          <div className="space-y-3">
            <StatusGuideItem
              icon={Clock}
              title="Pending Review"
              description="Your property is under admin review. Usually takes 24-48 hours."
              color="yellow"
            />
            <StatusGuideItem
              icon={CheckCircle2}
              title="Approved & Live"
              description="Your property is visible to all users and can receive inquiries."
              color="green"
            />
            <StatusGuideItem
              icon={AlertCircle}
              title="Need Help?"
              description="Contact support if you have questions about your listings."
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Property Status Breakdown */}
      {stats.total > 0 && (
        <div className="bg-card border border-glass-border rounded-xl p-6">
          <h3 className="font-display text-lg font-bold mb-4">Property Status Overview</h3>
          <div className="space-y-4">
            <StatusBar
              label="Approved Properties"
              value={stats.approved}
              total={stats.total}
              color="green"
            />
            <StatusBar
              label="Pending Review"
              value={stats.pending}
              total={stats.total}
              color="yellow"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const TipItem = ({
  icon: Icon,
  text,
  color,
}: {
  icon: typeof CheckCircle2;
  text: string;
  color: "green" | "yellow" | "blue" | "red";
}) => {
  const colorClasses = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    blue: "text-blue-500",
    red: "text-red-500",
  };
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`w-4 h-4 ${colorClasses[color]} mt-0.5 flex-shrink-0`} />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
};

const StatusGuideItem = ({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  color: "green" | "yellow" | "blue" | "red";
}) => {
  const bgColorClasses = {
    green: "bg-green-500/10",
    yellow: "bg-yellow-500/10",
    blue: "bg-blue-500/10",
    red: "bg-red-500/10",
  };
  const iconColorClasses = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    blue: "text-blue-500",
    red: "text-red-500",
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`w-10 h-10 rounded-lg ${bgColorClasses[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColorClasses[color]}`} />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
};

const StatusBar = ({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "green" | "yellow" | "red";
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value} / {total} ({Math.round(percentage)}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};
