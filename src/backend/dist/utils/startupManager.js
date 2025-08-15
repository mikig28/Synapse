"use strict";
/**
 * Startup Manager - Handles phased initialization to prevent timeouts on Render
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupManager = exports.StartupManager = void 0;
class StartupManager {
    constructor() {
        this.phases = [];
        this.startTime = Date.now();
    }
    addPhase(phase) {
        this.phases.push(phase);
        // Sort by priority (lower number = higher priority)
        this.phases.sort((a, b) => a.priority - b.priority);
    }
    async executePhases() {
        console.log('[StartupManager] Starting phased initialization...');
        for (const phase of this.phases) {
            const phaseStart = Date.now();
            console.log(`[StartupManager] Starting phase: ${phase.name} (priority: ${phase.priority})`);
            try {
                // Execute phase with timeout
                await this.executeWithTimeout(phase.execute(), phase.timeout, phase.name);
                const duration = Date.now() - phaseStart;
                console.log(`[StartupManager] ✅ Phase completed: ${phase.name} (${duration}ms)`);
            }
            catch (error) {
                const duration = Date.now() - phaseStart;
                console.error(`[StartupManager] ❌ Phase failed: ${phase.name} (${duration}ms)`, error);
                if (phase.required) {
                    throw new Error(`Required phase "${phase.name}" failed: ${error.message}`);
                }
                else {
                    console.log(`[StartupManager] ⚠️ Continuing despite failure (non-required phase)`);
                }
            }
        }
        const totalDuration = Date.now() - this.startTime;
        console.log(`[StartupManager] ✅ All phases completed (total: ${totalDuration}ms)`);
    }
    async executeWithTimeout(promise, timeoutMs, phaseName) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Phase "${phaseName}" timed out after ${timeoutMs}ms`)), timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]);
    }
    getTotalElapsedTime() {
        return Date.now() - this.startTime;
    }
}
exports.StartupManager = StartupManager;
// Singleton instance
exports.startupManager = new StartupManager();
