import { mountSettings, getSettings } from "/components/settings.js";
import { mountChat } from "/components/chatUI.js";
import { mountMindmap } from "/components/mindmapUI.js";
mountSettings();
mountChat();
mountMindmap();
console.log("Axiom ready. Settings:", getSettings());
