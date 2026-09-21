import { requestForToken } from "@/lib/firebase";
import { registerDeviceApi } from "@/services/deviceService";

/**
 * Gets the current browser name to use as device_name
 */
export const getBrowserName = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("SamsungBrowser")) return "Samsung Browser";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Edge") || userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Web Browser";
};

/**
 * Orchestrates the device registration for notifications
 */
export const handleDeviceRegistration = async () => {
  try {
    const fcm_token = await requestForToken();
    
    if (!fcm_token) {
      return;
    }

    const payload = {
      fcm_token,
      device_type: "web",
      device_name: getBrowserName(),
    };

    await registerDeviceApi(payload);
  } catch (error) {
    // Swallow errors silently to avoid blocking login/UX
  }
};

