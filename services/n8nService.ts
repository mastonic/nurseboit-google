
import { Role } from "../types";
import { getStore } from "./store.ts";

/**
 * Service de communication NurseBot <-> n8n
 * Supporte Nginx, Traefik et Firebase Proxy
 */
export const callNurseBotAgent = async (payload: {
  event: string;
  message?: string;
  data?: string;
  role: Role;
  context?: any;
}) => {
  const store = getStore();
  
  let baseUrl = (payload.context?.config?.n8nBaseUrl || 
                store.settings.apiConfig.n8nBaseUrl || 
                process.env.VITE_N8N_BASE_URL || "").trim();

  const apiKey = (payload.context?.config?.n8nApiKey || 
                 store.settings.apiConfig.n8nApiKey || 
                 process.env.VITE_N8N_API_KEY || "").replace(/[^\x00-\xFF]/g, "").trim();

  if (!baseUrl) {
    throw new Error("CONFIG_MISSING: L'URL du webhook n8n n'est pas renseignée.");
  }

  const isProxy = baseUrl.startsWith('/');
  const finalUrl = isProxy 
    ? `${window.location.origin}${baseUrl}` 
    : baseUrl.replace(/\/+$/, "");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-N8N-API-KEY': apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        context: { ...payload.context, config: undefined }
      })
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      const body = await response.text();
      // Si le corps contient "Google" ou "Firebase", c'est une erreur de routage DNS/Cloud
      if (body.toLowerCase().includes('google') || body.toLowerCase().includes('firebase')) {
        throw new Error("ERR_PROXY_404: Google Cloud intercepte votre requête. Vérifiez votre DNS (IP du VPS).");
      }
      throw new Error(isProxy ? "ERR_PROXY_404" : "ERR_URL_404");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API_ERROR: ${response.status} - ${text.slice(0, 50)}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error("TIMEOUT: L'IA met trop de temps à répondre.");
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error(isProxy ? "ERR_NETWORK_PROXY" : "ERR_CORS_OR_DOWN");
    }

    throw error;
  }
};
