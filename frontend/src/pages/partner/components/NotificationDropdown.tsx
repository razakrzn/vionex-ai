import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationAsReadApi,
  deleteNotificationApi,
  deleteReadNotificationsApi,
  Notification,
} from "@/services/admin/notifications";
import { getCurrentUserApi } from "@/services/admin/users";
import { useAuthStore } from "@/stores/authStore";
import { formatDistanceToNow } from "date-fns";

interface NotificationDropdownProps {
  className?: string;
  showText?: boolean; // Show text label in mobile view
}

export const NotificationDropdown = ({ className, showText = false }: NotificationDropdownProps) => {
  const { toast } = useToast();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const hasCheckedVerificationRef = useRef<Set<number>>(new Set());

  // Refresh user data from /users/ API
  const refreshUserData = useCallback(async () => {
    const authStore = useAuthStore.getState();
    const currentUser = authStore.user;
    
    if (!currentUser?.id) return;

    try {
      const userResponse = await getCurrentUserApi();
      if (userResponse && 'data' in userResponse && 'status' in userResponse) {
        const responseData = userResponse.data;
        // Extract user from data array (response.data is an array)
        const usersArray = responseData?.data;
        if (Array.isArray(usersArray) && usersArray.length > 0) {
          const updatedUserData = usersArray[0]; // Get first user from array
          authStore.updateUser(updatedUserData as any);


        } else if (responseData?.data && !Array.isArray(responseData.data)) {
          // Fallback: if data is not an array, use it directly
          authStore.updateUser(responseData.data as any);

        }
      }
    } catch (error: any) {
      console.error("=== [NotificationDropdown] Error refreshing user data ===");
      console.error("Error:", error);
    }
  }, []);

  // Fetch unread count and notifications
  const fetchUnreadCount = useCallback(async () => {
    const authStore = useAuthStore.getState();
    const currentUser = authStore.user;
    
    if (!currentUser) return;

    setIsLoadingCount(true);
    try {
      // 1. Fetch the actual unread count from the dedicated endpoint
      const countResponse = await getUnreadCountApi();
      if (countResponse && "data" in countResponse) {
        const countData = countResponse.data;
        const count = countData?.unread_count ?? countData?.data?.unread_count ?? 0;
        setUnreadCount(count);
      }

      // 2. Fetch notifications list
      const response = await getNotificationsApi();

      if (response && "data" in response) {
        const responseData = response.data;

        // Handle response structure: {count: 1, next: null, previous: null, results: [...]}
        const notificationsArray = Array.isArray(responseData?.results) 
          ? responseData.results 
          : Array.isArray(responseData?.data) 
          ? responseData.data 
          : Array.isArray(responseData) 
          ? responseData 
          : [];

        setNotifications(notificationsArray);
        
        // Check for VERIFICATION_REJECTED or VERIFICATION_APPROVED notifications
        const verificationNotifications = notificationsArray.filter(
          (notif: Notification) =>
            (notif.type === "VERIFICATION_REJECTED" || notif.type === "VERIFICATION_APPROVED") &&
            !hasCheckedVerificationRef.current.has(notif.id)
        );
        
        if (verificationNotifications.length > 0) {
          // Mark these notifications as checked to prevent duplicate calls
          verificationNotifications.forEach((notif) => {
            hasCheckedVerificationRef.current.add(notif.id);
          });
          
          // Auto-call /users/ API to refresh user data
          refreshUserData();
        }

        // Check for PROPERTY_REJECTED or PROPERTY_APPROVED notifications
        const propertyNotifications = notificationsArray.filter(
          (notif: Notification) =>
            (notif.type === "PROPERTY_REJECTED" || notif.type === "PROPERTY_APPROVED") &&
            !hasCheckedVerificationRef.current.has(notif.id)
        );
        
        if (propertyNotifications.length > 0) {
          // Mark these notifications as checked to prevent duplicate calls
          propertyNotifications.forEach((notif) => {
            hasCheckedVerificationRef.current.add(notif.id);
          });
          
          // Dispatch custom event to refresh rejected properties
          window.dispatchEvent(new CustomEvent("propertyNotificationReceived", {
            detail: { notifications: propertyNotifications }
          }));
        }
      }
    } catch (error: any) {
      console.error("[NotificationDropdown] fetchNotifications error:", error);
    } finally {
      setIsLoadingCount(false);
      setIsLoading(false);
    }
  }, [refreshUserData]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await markNotificationAsReadApi(notificationId);
      if (response && "data" in response) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Refresh unread count from server to ensure accuracy
        fetchUnreadCount();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  };

  // Delete a notification
  const handleDeleteNotification = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(notificationId);
    try {
      const response = await deleteNotificationApi(notificationId);
      if (response && "data" in response) {
        // Remove from local state
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
        // Update unread count if it was unread
        const deletedNotif = notifications.find((n) => n.id === notificationId);
        if (deletedNotif && !deletedNotif.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        toast({
          title: "Notification Deleted",
          description: "The notification has been deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Delete all read notifications
  const handleDeleteReadNotifications = async () => {
    try {
      const response = await deleteReadNotificationsApi();
      if (response && "data" in response) {
        // Remove all read notifications from local state
        setNotifications((prev) => prev.filter((notif) => !notif.is_read));
        toast({
          title: "Read Notifications Deleted",
          description: "All read notifications have been deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      toast({
        title: "Error",
        description: "Failed to delete read notifications.",
        variant: "destructive",
      });
    }
  };

  // Load initial unread count on mount
  useEffect(() => {
    const authStore = useAuthStore.getState();
    if (authStore.isAuthenticated) {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Load data when dropdown opens (refresh when opened)
  useEffect(() => {
    if (isOpen) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        fetchUnreadCount();
      }
    }
  }, [isOpen, fetchUnreadCount]);

  // Listen for FCM messages to refresh count/list
  useEffect(() => {
    const handleFcmMessage = (event: any) => {
      const payload = event.detail;
      console.log("[FCM] Dropdown reacting to message:", payload);
      
      // Increment unread count locally
      setUnreadCount((prev) => prev + 1);
      
      // If dropdown is open, refresh the list
      if (isOpen) {
        fetchUnreadCount();
      }
    };

    window.addEventListener("fcmMessageReceived", handleFcmMessage);
    return () => window.removeEventListener("fcmMessageReceived", handleFcmMessage);
  }, [isOpen, fetchUnreadCount]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative hover:bg-blue-50 dark:hover:bg-muted ${showText ? 'justify-start w-full' : ''} ${className}`}
          title="Notifications"
        >
          <Bell className={`h-4 w-4 ${showText ? 'mr-2' : ''}`} />
          {showText && <span>Notifications</span>}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        
        sideOffset={0}
        className="w-80 p-0"
        style={{ marginTop: '10px' }}
      >
        <div className="p-4 border-b border-glass-border">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {isLoadingCount && (
            <p className="text-xs text-muted-foreground mt-1">Loading...</p>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-glass-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {notification.type_display && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notification.type_display}
                            </p>
                          )}
                        </div>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        disabled={isDeleting === notification.id}
                        title="Delete notification"
                      >
                        {isDeleting === notification.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t border-glass-border flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                // Mark all as read
                notifications
                  .filter((n) => !n.is_read)
                  .forEach((n) => handleMarkAsRead(n.id));
              }}
            >
              Mark all as read
            </Button>
            {notifications.some((n) => n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-destructive hover:text-destructive"
                onClick={handleDeleteReadNotifications}
              >
                Delete read
              </Button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
