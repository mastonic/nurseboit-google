
import { masterAgent } from './agents/masterAgent';
import {
    getStore,
    updatePatient,
    addTransmission,
    updateAppointment,
    addPatient, // Ensure this is imported
    getCurrentSession
} from './store';
import { transcribeVoiceNote } from './geminiService';
import { Patient, Transmission, Appointment } from '../types';

export const agentService = {
    /**
     * Processes a user command (text or voice) and executes the corresponding actions.
     */
    async processCommand(input: string | Blob, isVoice: boolean = false) {
        let textCommand = '';

        if (isVoice && input instanceof Blob) {
            // 1. Transcription phase
            const base64 = await this.blobToBase64(input);
            const res = await transcribeVoiceNote(base64);
            textCommand = typeof res === 'string' ? res : res.transcription;
        } else {
            textCommand = input as string;
        }

        if (!textCommand) throw new Error("Command empty or transcription failed");

        // 2. AI Execution (BMAD Orchestration)
        const context = {
            store: getStore(),
            timestamp: new Date().toISOString()
        };

        const result = await masterAgent.execute(textCommand, context);

        // 3. Dispatching Actions
        const session = getCurrentSession();
        let actionFeedback = '';
        const { intent, metadata } = result;

        try {
            if (intent === 'CREATE_PATIENT' && metadata.admin?.patientData) {
                const data = metadata.admin.patientData;
                const newPatient: Patient = {
                    id: crypto.randomUUID(),
                    firstName: data.firstName || 'Inconnu',
                    lastName: data.lastName || 'Patient',
                    phone: data.phone || '',
                    address: data.address || '',
                    careType: data.careType || 'Général',
                    recurrence: 'À définir',
                    notes: '',
                    isALD: false,
                    assignedNurseIds: session ? [session.userId] : []
                };
                await addPatient(newPatient);
                actionFeedback = `✅ Patient ${newPatient.lastName} créé.`;
            }
            else if (intent === 'CREATE_TRANSMISSION' && metadata.medical?.transmissionData) {
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
            else if (intent === 'CREATE_APPOINTMENT' && metadata.admin?.appointmentData) {
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
            }
        } catch (err) {
            console.error("Action Error:", err);
            actionFeedback = "❌ Échec de l'action automatique.";
        }

        return {
            text: textCommand,
            reply: result.reply,
            feedback: actionFeedback,
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
