
import { processUserMessage } from "../services/geminiService";

async function testBMAD() {
    console.log("--- Testing BMAD Multi-Agent System ---");

    const context = {
        cabinetStaff: [
            { firstName: "Alice" },
            { firstName: "Bertrand" }
        ],
        patient: {
            firstName: "Jean",
            lastName: "Dupont"
        }
    };

    const tests = [
        "Bonjour NurseBot, qui est de garde demain ?",
        "Crée un dossier Drive pour M. Dupont s'il te plaît.",
        "J'ai une nouvelle ordonnance d'AMI 2 pour Alice."
    ];

    for (const test of tests) {
        console.log(`\nUser: ${test}`);
        try {
            const result = await processUserMessage(test, 'infirmiere', context);
            console.log("NurseBot Response:", result.reply);
            console.log("Intent:", result.intent);
            console.log("Metadata:", JSON.stringify(result.metadata || {}, null, 2));
        } catch (e) {
            console.error("Test failed:", e);
        }
    }
}

testBMAD();
