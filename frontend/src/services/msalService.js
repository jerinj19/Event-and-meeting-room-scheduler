import { PublicClientApplication } from "@azure/msal-browser";

// Environment variables from Vite (.env or .env.local)
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || "common";

export const isMsalConfigured = () => {
  return Boolean(CLIENT_ID && CLIENT_ID !== "your_azure_client_id_here");
};

export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
};

let pcaInstance = null;

export const getMsalInstance = async () => {
  if (!isMsalConfigured()) {
    throw new Error(
      "Microsoft 365 configuration missing. Please set VITE_AZURE_CLIENT_ID in your frontend .env file."
    );
  }

  if (!pcaInstance) {
    const pca = new PublicClientApplication(msalConfig);
    await pca.initialize();
    pcaInstance = pca;
  }
  return pcaInstance;
};

/**
 * Initiates Microsoft 365 sign-in via reliable OAuth 2.0 full-page redirect.
 * This completely avoids browser popup blockers, COOP policy restrictions, and popup timeout errors.
 */
export const loginWithMicrosoftRedirect = async () => {
  const pca = await getMsalInstance();
  await pca.loginRedirect(loginRequest);
};
