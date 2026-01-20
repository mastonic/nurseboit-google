
import { masterAgent } from './agents/masterAgent';
import {
    getStore,
    updatePatient,
    addTransmission,
    updateAppointment,
    addPatient,
    addTask,
    getCurrentSession
} from './store';
import { transcribeVoiceNote } from './geminiService';
import { Patient, Transmission, Appointment, Task } from '../types';

export const agentService = {
    /**
     * Processes a user command (text or voice) and executes the corresponding actions.
     */
    async processCommand(input: string | Blob, isVoice: boolean = false) {
        let textCommand = '';

        if (isVoice && input instanceof Blob) {
            // 1. Transcription phase
            const base64 = await this.blobToBase64(input);
            const res = await transcribeVoiceNote(base64, input.type); // Pass MIME type
            textCommand = typeof res === 'string' ? res : res.transcription;
        } else {
            textCommand = input as string;
        }

        if (!textCommand) throw new Error("Command empty or transcription failed");

        // 2. Check for pending confirmation FIRST (before calling AI)
        const session = getCurrentSession();
        let actionFeedback = '';

        // Check if user is confirming a pending action
        const confirmationWords = ['oui', 'yes', 'ok', 'confirme', 'confirmer', 'd\'accord', 'daccord'];
        const isConfirmation = confirmationWords.some(word => textCommand.toLowerCase().trim().includes(word));

        if (isConfirmation && (window as any).__pendingAction) {
            const pending = (window as any).__pendingAction;
            console.log("[AgentService] User confirmed pending action:", pending.type);

            try {
                if (pending.type === 'CREATE_PATIENT') {
                    await addPatient(pending.data);
                    actionFeedback = `✅ Patient ${pending.data.firstName} ${pending.data.lastName} créé avec succès !`;
                    console.log("[AgentService] Patient created successfully:", pending.data.id);
                    delete (window as any).__pendingAction;

                    // Return immediately without calling AI
                    return {
                        text: textCommand,
                        reply: actionFeedback,
                        feedback: '',
                        raw: { intent: 'CONFIRMATION_EXECUTED', metadata: {} }
                    };
                }
            } catch (err) {
                console.error("[AgentService] Error executing confirmed action:", err);
                actionFeedback = "❌ Erreur lors de la création du patient.";
                delete (window as any).__pendingAction;

                return {
                    text: textCommand,
                    reply: actionFeedback,
                    feedback: '',
                    raw: { intent: 'CONFIRMATION_ERROR', metadata: { error: err } }
                };
            }
        }

        // 3. AI Execution (BMAD Orchestration)
        const now = new Date();
        const context = {
            store: getStore(),
            timestamp: now.toISOString(),
            currentDate: now.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            currentYear: 2026 // CRITICAL: Explicit year to prevent AI hallucination
        };

        const result = await masterAgent.execute(textCommand, context);

        // 4. Dispatching Actions
        const { intent, metadata } = result;

        // Normalize intent to uppercase for comparison (handles createPatient, CREATE_PATIENT, create_patient, etc.)
        // CRITICAL: Check if already uppercase to avoid double-underscoring SCREAMING_SNAKE_CASE
        const normalizedIntent = intent === intent?.toUpperCase()
            ? intent  // Already uppercase (e.g., "CREATE_PATIENT"), use as-is
            : intent?.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase(); // camelCase, convert to SCREAMING_SNAKE_CASE

        console.log("[AgentService] Dispatching actions:", {
            originalIntent: intent,
            normalizedIntent,
            metadata
        });

        try {
            if (normalizedIntent === 'CREATE_PATIENT' && metadata.admin?.patientData) {
                console.log("[AgentService] Patient creation requested:", metadata.admin.patientData);
                const data = metadata.admin.patientData;

                // Build confirmation message
                const confirmMsg = `Je vais créer un dossier patient avec ces informations :
                
📋 **Nom** : ${data.firstName || '?'} ${data.lastName || '?'}
📞 **Téléphone** : ${data.phone || 'Non fourni'}
📍 **Adresse** : ${data.address || 'Non fournie'}
🏥 **Type de soin** : ${data.careType || 'Général'}

Voulez-vous confirmer la création ? (Répondez "oui" pour confirmer)`;

                // Store pending action for confirmation
                (window as any).__pendingAction = {
                    type: 'CREATE_PATIENT',
                    data: {
                        id: crypto.randomUUID(),
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        phone: data.phone || '',
                        address: data.address || '',
                        careType: data.careType || 'Général',
                        recurrence: 'À définir',
                        notes: '',
                        isALD: false,
                        assignedNurseIds: session ? [session.userId] : []
                    }
                };

                actionFeedback = confirmMsg;
                console.log("[AgentService] Waiting for user confirmation");
            }
            else if (normalizedIntent === 'CREATE_TRANSMISSION' && metadata.medical?.transmissionData) {
                console.log("[AgentService] Creating transmission with data:", metadata.medical.transmissionData);
                const data = metadata.medical.transmissionData;

                // Try to find patientId if only name was provided
                let targetId = data.patientId;
                if (!targetId && data.patientName) {
                    const p = context.store.patients.find((pat: any) =>
                        pat.lastName.toLowerCase().includes(data.patientName.toLowerCase())
                    );
                    if (p) targetId = p.id;
                }

                const newTrans: Transmission = {
                    id: crypto.randomUUID(),
                    patientId: targetId || 'unknown',
                    fromId: session?.userId || 'system',
                    fromName: session?.name || 'NurseBot AI',
                    text: data.text,
                    category: (data.category as any) || 'clinique',
                    priority: (data.priority as any) || 'medium',
                    status: 'sent',
                    timestamp: new Date().toISOString()
                };
                await addTransmission(newTrans);
                actionFeedback = `✅ Transmission enregistrée.`;
            }
            else if (normalizedIntent === 'CREATE_APPOINTMENT' && metadata.admin?.appointmentData) {
                console.log("[AgentService] Creating appointment with data:", metadata.admin.appointmentData);
                const data = metadata.admin.appointmentData;
                const newApt: Appointment = {
                    id: crypto.randomUUID(),
                    patientId: data.patientId || context.store.patients[0]?.id,
                    nurseId: session?.userId || 'u1',
                    dateTime: data.dateTime || new Date().toISOString(),
                    durationMinutes: data.durationMinutes || 30,
                    type: 'care',
                    status: 'scheduled'
                };
                await updateAppointment(newApt);
                actionFeedback = `✅ Rendez-vous planifié.`;
                console.log("[AgentService] Appointment created successfully:", newApt.id);
            }
            else if (normalizedIntent === 'CREATE_TASK' && metadata.admin?.taskData) {
                console.log("[AgentService] Creating task with data:", metadata.admin.taskData);
                const data = metadata.admin.taskData;

                const newTask: Task = {
                    id: crypto.randomUUID(),
                    title: data.title || data.description || 'Nouvelle tâche',
                    priority: (data.priority as any) || 'medium',
                    deadline: data.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    ownerId: session?.userId || 'system',
                    patientId: data.patientId,
                    status: 'todo'
                };

                await addTask(newTask);
                actionFeedback = `✅ Tâche créée : ${newTask.title}`;
                console.log("[AgentService] Task created successfully:", newTask.id);
            }
            else {
                console.log("[AgentService] No action taken. Intent:", intent, "Normalized:", normalizedIntent, "Metadata:", metadata);
            }
        } catch (err) {
            console.error("Action Error:", err);
            actionFeedback = "❌ Échec de l'action automatique.";
        }

        return {
            text: textCommand,
            reply: actionFeedback || result.reply,
            feedback: actionFeedback ? '' : '',
            raw: result
        };
    },

    async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};
