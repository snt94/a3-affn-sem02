import { setupBridgeSimulation } from "./simulation.js";

const button = document.getElementById("simulateBtn")

const container = document.getElementById("bridgeContainer");

setupBridgeSimulation(container, button);