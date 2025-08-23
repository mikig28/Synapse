// ==================================================
// CLEAN SESSION RECOVERY METHODS FOR WAHA SERVICE
// Add these methods to your WAHAService class
// ==================================================

/**
 * Restart failed WAHA session - handles FAILED session states
 */
async restartSession(sessionName: string = this.defaultSession): Promise<boolean> {
  try {
    console.log(`[WAHA Service] 🔄 Attempting to restart session '${sessionName}'...`);
    
    // First, delete the failed session
    try {
      await this.httpClient.delete(`/api/sessions/${sessionName}`);
      console.log(`[WAHA Service] ✅ Deleted failed session '${sessionName}'`);
    } catch (deleteError: any) {
      console.log(`[WAHA Service] ⚠️ Could not delete session (might not exist):`, deleteError.response?.status);
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start new session
    const response = await this.httpClient.post(`/api/sessions/${sessionName}/start`, {
      name: sessionName
    });
    
    console.log(`[WAHA Service] ✅ Started new session '${sessionName}':`, response.data);
    
    // Reset connection status
    this.connectionStatus = 'disconnected';
    this.emit('session_restarted', { session: sessionName });
    
    return true;
  } catch (error: any) {
    console.error(`[WAHA Service] ❌ Failed to restart session '${sessionName}':`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Auto-recover from FAILED session state
 */
async autoRecoverSession(sessionName: string = this.defaultSession): Promise<boolean> {
  try {
    const status = await this.getSessionStatus(sessionName);
    
    if (status.status === 'FAILED') {
      console.log(`[WAHA Service] 🔄 Auto-recovering FAILED session '${sessionName}'...`);
      return await this.restartSession(sessionName);
    }
    
    return true;
  } catch (error: any) {
    console.error(`[WAHA Service] ❌ Auto-recovery failed for '${sessionName}':`, error.message);
    return false;
  }
}
