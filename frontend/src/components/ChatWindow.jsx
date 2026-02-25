import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import PropTypes from 'prop-types';

export default function ChatWindow({ messages, isLoading, suggestions, onSuggestion }) {
    const bottomRef = useRef(null);

    // Auto-scroll to bottom whenever messages change or loading state changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="messages-window">
                <div className="empty-state">
                    <div className="orb">🤖</div>
                    <h3>How can I help you today?</h3>
                    <p>
                        Ask me anything about your account, billing, security, or platform features.
                        Answers are grounded in our knowledge base using AI-powered retrieval.
                    </p>
                    <div className="suggestion-chips">
                        {suggestions.map((s) => (
                            <button key={s} className="chip" onClick={() => onSuggestion(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="messages-window">
            {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
            ))}

            {/* Typing / loading indicator */}
            {isLoading && (
                <div className="message-row">
                    <div className="avatar ai">🤖</div>
                    <div className="bubble-wrapper">
                        <div className="bubble ai">
                            <div className="typing-indicator">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}

ChatWindow.propTypes = {
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            role: PropTypes.string.isRequired,
            content: PropTypes.string.isRequired,
            timestamp: PropTypes.string.isRequired,
            retrievedChunks: PropTypes.number,
            fallback: PropTypes.bool,
            tokensUsed: PropTypes.number,
            latencyMs: PropTypes.number,
        })
    ).isRequired,
    isLoading: PropTypes.bool.isRequired,
    suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onSuggestion: PropTypes.func.isRequired,
};
