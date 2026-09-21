import { useState, useEffect } from "react";
import { Search, Filter, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCard } from "./UserCard";
import type { User, UserRole, UserStatus } from "../types";
import { getAdminUsersApi, AdminUser } from "@/services/admin/users";
import { useToast } from "@/hooks/use-toast";
import type { TabType } from "../types";

interface UsersTabProps {
  activeTab?: TabType;
}

export const UsersTab = ({ activeTab }: UsersTabProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerTypeFilter, setSellerTypeFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportRole, setExportRole] = useState<string>("all");
  const [exportSellerType, setExportSellerType] = useState<string>("all");
  const [exportSuspended, setExportSuspended] = useState<string>("all");
  const [exportSubscribed, setExportSubscribed] = useState<string>("all");

  useEffect(() => {
    // Fetch users from backend
    const fetchUsers = async () => {
      setIsLoading(true);
      try {


        let allUsers: any[] = [];
        
        // Fetch based on activeTab
        if (activeTab === "owners") {
          // Fetch only owners
          const response = await getAdminUsersApi("owner");
          if ('data' in response && 'status' in response && response.data?.data) {
            allUsers = response.data.data;
          }
        } else if (activeTab === "fitness_owners" || activeTab === "gym_owners") {
          // Fetch only fitness owners (gym_owner role)
          const response = await getAdminUsersApi("gym_owner");
          if ('data' in response && 'status' in response && response.data?.data) {
            allUsers = response.data.data;
          }
        } else if (activeTab === "seekers") {
          // Fetch only seekers
          const response = await getAdminUsersApi("seeker");
          if ('data' in response && 'status' in response && response.data?.data) {
            allUsers = response.data.data;
          }
        } else if (activeTab === "all_users" || activeTab === "users") {
          // Fetch owners, seekers, and gym owners
          try {
            const [ownersResponse, seekersResponse, gymOwnersResponse] = await Promise.all([
              getAdminUsersApi("owner"),
              getAdminUsersApi("seeker"),
              getAdminUsersApi("gym_owner"),
            ]);
            
            if ('data' in ownersResponse && 'status' in ownersResponse && ownersResponse.data?.data) {
              allUsers = [...allUsers, ...ownersResponse.data.data];
            }
            if ('data' in seekersResponse && 'status' in seekersResponse && seekersResponse.data?.data) {
              allUsers = [...allUsers, ...seekersResponse.data.data];
            }
            if ('data' in gymOwnersResponse && 'status' in gymOwnersResponse && gymOwnersResponse.data?.data) {
              allUsers = [...allUsers, ...gymOwnersResponse.data.data];
            }
          } catch (error) {
            console.error("Error fetching all users:", error);
          }
        } else {
          // Default: fetch seekers
          const response = await getAdminUsersApi("seeker");
          if ('data' in response && 'status' in response && response.data?.data) {
            allUsers = response.data.data;
          }
        }


        if (allUsers.length > 0) {
          // Map API response to User format
          const mappedUsers: User[] = allUsers.map((apiUser: any) => {
            // Map role - admin, seeker (Buyer), owner (Seller), gym_owner (Seller)
            let userRole: UserRole = "buyer";
            const isGymOwner = apiUser.role === "gym_owner";
            if (apiUser.role === "admin") {
              userRole = "admin";
            } else if (apiUser.role === "seeker") {
              userRole = "buyer";
            } else if (apiUser.role === "owner" || isGymOwner) {
              userRole = "seller";
            } else {
              userRole = "buyer";
            }
            
            // Map status based on is_suspended and is_active
            let userStatus: UserStatus = "active";
            if (apiUser.is_suspended) {
              userStatus = "suspended";
            } else if (!apiUser.is_active) {
              userStatus = "inactive";
            } else {
              userStatus = "active";
            }
            
            // Format date to dd-mm-yyyy
            const joinedDate = apiUser.date_joined 
              ? (() => {
                  const date = new Date(apiUser.date_joined);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  return `${day}-${month}-${year}`;
                })()
              : "N/A";
            
            return {
              id: String(apiUser.id),
              name: apiUser.full_name || apiUser.email?.split('@')[0] || "Unknown",
              email: apiUser.email || "",
              phone: apiUser.mobile_number || "N/A",
              company: apiUser.company_name || apiUser.address || undefined,
              raw_role: apiUser.role || undefined,
              role: userRole,
              status: userStatus,
              joinedDate: joinedDate,
              lastLogin: "N/A", // API doesn't provide this
              listingCount: 0, // API doesn't provide this
              seller_type: apiUser.seller_type || undefined, // Preserve seller_type for owners
              is_suspended: Boolean(apiUser.is_suspended),
              // Gym owner specific fields
              isGymOwner: isGymOwner,
              license_number: apiUser.license_number || undefined,
              verification_status: apiUser.verification_status?.toLowerCase() || undefined,
              rejection_note: apiUser.rejection_note || undefined,
              profile_picture: apiUser.profile_picture || undefined,
              document_uploads: apiUser.document_uploads || undefined,
              is_subscribed: apiUser.is_subscribed || false,
              role_display: apiUser.role_display || undefined,
            };
          });

          setUsers(mappedUsers);
        } else {
          console.warn("No users data in response");
          setUsers([]);
        }

      } catch (error) {
        console.error("=== Error fetching Users (Users Tab) ===");
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch users. Please try again.",
          variant: "destructive",
        });
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [toast, activeTab]);

  const getFilteredUsers = (): User[] => {
    let filtered = users;

    // Filter by role based on activeTab
    // Note: The API already filters by role, so we just need to ensure we show the right users
    if (activeTab === "owners") {
      // Only show owners (mapped as "seller" in the component)
      filtered = filtered.filter((u) => u.role === "seller");
    } else if (activeTab === "fitness_owners" || activeTab === "gym_owners") {
      // Fitness owners are already filtered by API (gym_owner role)
      // They are mapped as "seller" role in the component, so show all fetched users
      // No additional filtering needed since API already filtered by role=gym_owner
    } else if (activeTab === "seekers") {
      // Only show seekers (mapped as "buyer" in the component)
      filtered = filtered.filter((u) => u.role === "buyer");
    } else if (activeTab === "all_users" || activeTab === "users") {
      // Show all users - no role filter
    }

    // Filter by role (all users tab)
    if ((activeTab === "all_users" || activeTab === "users") && roleFilter !== "all") {
      filtered = filtered.filter((u) => (u.raw_role || "").toLowerCase() === roleFilter);
    }

    // Filter by seller_type (only when owners are selected)
    if ((activeTab === "owners" || roleFilter === "owner") && sellerTypeFilter !== "all") {
      filtered = filtered.filter((u) => {
        const sellerType = u.seller_type?.toUpperCase();
        if (sellerTypeFilter === "individual") return sellerType === "INDIVIDUAL";
        if (sellerTypeFilter === "agent") return sellerType === "AGENT";
        if (sellerTypeFilter === "company") return sellerType === "COMPANY";
        return false;
      });
    }

    // Filter by verification status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (u) => (u.verification_status || "").toLowerCase() === statusFilter
      );
    }

    // Filter by subscription
    if (subscriptionFilter !== "all") {
      filtered = filtered.filter((u) => {
        if (subscriptionFilter === "subscribed") return Boolean(u.is_subscribed);
        if (subscriptionFilter === "not_subscribed") return !u.is_subscribed;
        return true;
      });
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phone.toLowerCase().includes(query) ||
          u.company?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getExportUsers = (): User[] => {
    let filtered = users;

    if (exportRole !== "all") {
      filtered = filtered.filter((u) => (u.raw_role || "").toLowerCase() === exportRole);
    }

    if ((exportRole === "all" || exportRole === "owner") && exportSellerType !== "all") {
      filtered = filtered.filter((u) => {
        const sellerType = u.seller_type?.toUpperCase();
        if (exportSellerType === "individual") return sellerType === "INDIVIDUAL";
        if (exportSellerType === "agent") return sellerType === "AGENT";
        if (exportSellerType === "company") return sellerType === "COMPANY";
        return false;
      });
    }

    if (exportSuspended !== "all") {
      filtered = filtered.filter((u) => {
        if (exportSuspended === "suspended") return Boolean(u.is_suspended);
        if (exportSuspended === "not_suspended") return !u.is_suspended;
        return true;
      });
    }

    if (exportSubscribed !== "all") {
      filtered = filtered.filter((u) => {
        if (exportSubscribed === "subscribed") return Boolean(u.is_subscribed);
        if (exportSubscribed === "not_subscribed") return !u.is_subscribed;
        return true;
      });
    }

    return filtered;
  };

  const exportUsers = () => {
    const rows = getExportUsers();
    const data = rows.map((u) => ({
      ID: u.id,
      Name: u.name || "",
      Email: u.email || "",
      Phone: u.phone || "",
      Role: u.raw_role || "",
      "Seller Type": u.seller_type || "",
      Suspended: u.is_suspended ? "Yes" : "No",
      Subscribed: u.is_subscribed ? "Yes" : "No",
      Company: u.company || "",
      "Joined Date": u.joinedDate || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    const fileName = `users-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const workbookArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([workbookArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get title based on active tab
  const getTitle = () => {
    if (activeTab === "owners") return "Space Owners";
    if (activeTab === "fitness_owners" || activeTab === "gym_owners") return "Fitness Owners";
    if (activeTab === "seekers") return "Seekers";
    if (activeTab === "all_users") return "All Users";
    return "Users";
  };

  const getDescription = () => {
    if (activeTab === "owners") return "Manage property owners";
    if (activeTab === "fitness_owners" || activeTab === "gym_owners") return "Manage fitness center owners";
    if (activeTab === "seekers") return "Manage property seekers";
    if (activeTab === "all_users") return "Manage all system users";
    return "Manage system users, admins, buyers, and sellers";
  };

  const exportUsersList = getExportUsers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{getTitle()}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {getDescription()}
          </p>
        </div>
        {(activeTab === "all_users" || activeTab === "users") && (
          <Button variant="outline" onClick={() => setIsExportOpen(true)}>
            Export
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
        {(activeTab === "all_users" || activeTab === "users") && (
          <RoleFilter value={roleFilter} onChange={setRoleFilter} />
        )}
        {(activeTab === "owners" || roleFilter === "owner") && (
          <SellerTypeFilter value={sellerTypeFilter} onChange={setSellerTypeFilter} />
        )}
        {(activeTab === "all_users" || activeTab === "users") && (
          <SubscriptionFilter value={subscriptionFilter} onChange={setSubscriptionFilter} />
        )}
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <UserCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <UsersGrid
            users={filteredUsers}
            onDeleted={(userId) => {
              setUsers((prev) => prev.filter((user) => user.id !== userId));
            }}
          />
          {filteredUsers.length === 0 && !isLoading && <EmptyState />}
        </>
      )}

      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-5xl bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Export Users</DialogTitle>
            <DialogDescription>
              Filter users and export the visible results to an Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <RoleFilter value={exportRole} onChange={setExportRole} />
            <div className="flex">
              <SellerTypeFilter
                value={exportSellerType}
                onChange={setExportSellerType}
                disabled={!(exportRole === "all" || exportRole === "owner")}
              />
            </div>
            <Select value={exportSuspended} onValueChange={setExportSuspended}>
              <SelectTrigger className="w-full bg-muted/30 border-glass-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Suspended" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="not_suspended">Not Suspended</SelectItem>
              </SelectContent>
            </Select>
            <SubscriptionFilter value={exportSubscribed} onChange={setExportSubscribed} />
          </div>

          <div className="max-h-[360px] overflow-auto border border-glass-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/30">
                <tr className="text-left">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Seller Type</th>
                  <th className="px-3 py-2">Suspended</th>
                  <th className="px-3 py-2">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {exportUsersList.map((user) => (
                  <tr key={user.id} className="border-t border-glass-border">
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">{user.raw_role || "-"}</td>
                    <td className="px-3 py-2">{user.seller_type || "-"}</td>
                    <td className="px-3 py-2">{user.is_suspended ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{user.is_subscribed ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {exportUsersList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No users match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportOpen(false)}>
              Close
            </Button>
            <Button onClick={exportUsers}>Export XLSX</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SearchInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search by name, email, phone, or company..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10 bg-muted/30 border-glass-border"
    />
  </div>
);

const SellerTypeFilter = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Seller Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Types</SelectItem>
      <SelectItem value="individual">Individual</SelectItem>
      <SelectItem value="agent">Agent</SelectItem>
      <SelectItem value="company">Company</SelectItem>
    </SelectContent>
  </Select>
);

const RoleFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Roles</SelectItem>
      <SelectItem value="owner">Owner</SelectItem>
      <SelectItem value="gym_owner">Gym Owner</SelectItem>
      <SelectItem value="seeker">Seeker</SelectItem>
    </SelectContent>
  </Select>
);

const SubscriptionFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Package className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Subscription" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="subscribed">Subscribed</SelectItem>
      <SelectItem value="not_subscribed">Not Subscribed</SelectItem>
    </SelectContent>
  </Select>
);

const StatusFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Status</SelectItem>
      <SelectItem value="pending">Pending</SelectItem>
      <SelectItem value="rejected">Rejected</SelectItem>
      <SelectItem value="approved">Approved</SelectItem>
    </SelectContent>
  </Select>
);

const UsersGrid = ({
  users,
  onDeleted,
}: {
  users: User[];
  onDeleted: (userId: string) => void;
}) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {users.map((user) => (
      <UserCard key={user.id} user={user} onDeleted={onDeleted} />
    ))}
  </div>
);

const UserCardSkeleton = () => (
  <div className="bg-card border border-glass-border rounded-xl overflow-hidden animate-pulse">
    {/* Header Skeleton */}
    <div className="p-4 border-b border-glass-border bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    </div>

    {/* Contact Info Skeleton */}
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
    </div>

    {/* Stats Skeleton */}
    <div className="p-4 border-t border-glass-border bg-muted/10">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-16 bg-muted rounded" />
        <div className="h-16 bg-muted rounded" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
  </div>
);

