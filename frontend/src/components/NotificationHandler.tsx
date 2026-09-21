import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserApi } from "@/services/admin/users";
import { useAuthStore } from "@/stores/authStore";

/**
 * Global component to handle foreground Firebase Cloud Messaging (FCM) notifications
 */
const NotificationHandler = () => {
  const { toast } = useToast();
  const { updateUser, isAuthenticated } = useAuthStore();

  // Simple notification tone using Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5

      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.08,
        audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.4
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);

      oscillator.onended = () => {
        gainNode.disconnect();
        oscillator.disconnect();
        audioContext.close();
      };
    } catch (error) {
      // Ignore sound errors silently
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, async (payload) => {
      const title = payload.notification?.title || "New Notification";
      const body = payload.notification?.body || "";
      const type = payload.data?.type;

      // 1. Play notification tone (best-effort; may be blocked by browser policies)
      playNotificationSound();

      // 2. Show toast notification
      toast({
        title: title,
        description: body,
      });

      // 3. Refresh user data for any notification to ensure state is synced
      try {
        const response = await getCurrentUserApi();
        if (response && "data" in response) {
          const responseData = response.data;
          // The API returns { success: true, data: { ...user } }
          if (responseData && responseData.data) {
            updateUser(responseData.data as any);
            
            // Show special message for verification
            if (type === "VERIFICATION_APPROVED") {
              toast({
                title: "Profile Verified!",
                description: "Your account has been approved. You now have full access.",
              });
            }
          }
        }
      } catch (error) {
        // Ignore user refresh errors silently
      }
      
      // Dispatch a custom event so other components can react if needed
      window.dispatchEvent(new CustomEvent("fcmMessageReceived", { detail: payload }));
    });

    return () => unsubscribe();
  }, [isAuthenticated, toast, updateUser]);

  return null; // This component doesn't render anything
};

export default NotificationHandler;

