// Session store: in-memory Map of sessionId -> messages[]
// Each message: { role: 'user' | 'model', content: string, timestamp: Date }

const sessions = new Map();
const MAX_HISTORY_PAIRS = 5; // Keep last 5 user+model pairs = 10 messages

/**
 * Get conversation history for a session (last N pairs).
 */
export function getHistory(sessionId) {
    if (!sessions.has(sessionId)) return [];
    const messages = sessions.get(sessionId);
    // Return last MAX_HISTORY_PAIRS*2 messages
    return messages.slice(-(MAX_HISTORY_PAIRS * 2));
}

/**
 * Add a message to a session's history.
 */
export function addMessage(sessionId, role, content) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
    }
    sessions.get(sessionId).push({ role, content, timestamp: new Date().toISOString() });
}

/**
 * Create a new empty session.
 */
export function createSession(sessionId) {
    sessions.set(sessionId, []);
}

/**
 * Clear all messages for a session (start fresh).
 */
export function clearSession(sessionId) {
    sessions.set(sessionId, []);
}

/**
 * Check if a session exists.
 */
export function sessionExists(sessionId) {
    return sessions.has(sessionId);
}

/**
 * Get total number of active sessions (for monitoring).
 */
export function getSessionCount() {
    return sessions.size;
}
