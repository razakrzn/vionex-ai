// Version information
// This version should match package.json version
// Update this when you bump the version in package.json
export const APP_VERSION = "1.0.0";
export const APP_NAME = "VIONEX AI";
export const BUILD_DATE = new Date().toISOString();

// Build information
export const getBuildInfo = () => {
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    environment: import.meta.env.MODE || "production",
  };
};

// Export version for easy access
export const VERSION = APP_VERSION;

