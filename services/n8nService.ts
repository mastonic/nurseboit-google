
import { Role } from "../types";
import { getStore } from "./store.ts";

/**
 * Service de communication NurseBot <-> n8n
 * Supporte le Proxy Inverse pour supprimer les erreurs CORS.
 */
export const callNurseBotAgent = async (payload: {
  event: string;
  message?: string;
  data?: string;
  role: Role;
  context?: any;
}) => {
  const store = getStore();
  
  // Si baseUrl commence par "/", fetch utilisera automatiquement le domaine courant (Solution Anti-CORS)
  let baseUrl = (payload.context?.config?.n8nBaseUrl || 
                store.settings.apiConfig.n8nBaseUrl || 
                "/nursebot-gateway").trim();

  const apiKey = (payload.context?.config?.n8nApiKey || 
                 store.settings.apiConfig.n8nApiKey || 
                 "").trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Si baseUrl est relatif, pas besoin de mode 'cors', 'same-origin' suffit
    const isRelative = baseUrl.startsWith('/');
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey
      },
      mode: isRelative ? 'same-origin' : 'cors',
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        context: { ...payload.context, config: undefined }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API_ERROR: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("n8n Agent Error:", error.message);
    throw error;
  }
};
