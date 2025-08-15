/**
 * Startup Manager - Handles phased initialization to prevent timeouts on Render
 */

export interface StartupPhase {
  name: string;
  priority: number; // Lower number = higher priority
  timeout: number; // Max time for this phase in ms
  required: boolean; // If true, failure stops startup
  execute: () => Promise<void>;
}

export class StartupManager {
  private phases: StartupPhase[] = [];
  private startTime: number = Date.now();

  addPhase(phase: StartupPhase): void {
    this.phases.push(phase);
    // Sort by priority (lower number = higher priority)
    this.phases.sort((a, b) => a.priority - b.priority);
  }

  async executePhases(): Promise<void> {
    console.log('[StartupManager] Starting phased initialization...');
    
    for (const phase of this.phases) {
      const phaseStart = Date.now();
      console.log(`[StartupManager] Starting phase: ${phase.name} (priority: ${phase.priority})`);
      
      try {
        // Execute phase with timeout
        await this.executeWithTimeout(phase.execute(), phase.timeout, phase.name);
        
        const duration = Date.now() - phaseStart;
        console.log(`[StartupManager] ✅ Phase completed: ${phase.name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - phaseStart;
        console.error(`[StartupManager] ❌ Phase failed: ${phase.name} (${duration}ms)`, error);
        
        if (phase.required) {
          throw new Error(`Required phase "${phase.name}" failed: ${(error as Error).message}`);
        } else {
          console.log(`[StartupManager] ⚠️ Continuing despite failure (non-required phase)`);
        }
      }
    }
    
    const totalDuration = Date.now() - this.startTime;
    console.log(`[StartupManager] ✅ All phases completed (total: ${totalDuration}ms)`);
  }

  private async executeWithTimeout(
    promise: Promise<any>, 
    timeoutMs: number, 
    phaseName: string
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Phase "${phaseName}" timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  getTotalElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// Singleton instance
export const startupManager = new StartupManager();