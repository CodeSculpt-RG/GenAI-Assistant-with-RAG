import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`message-row ${isUser ? 'user' : ''}`}>
            <div className={`avatar ${isUser ? 'user' : 'ai'}`}>
                {isUser ? '👤' : '🤖'}
            </div>

            <div className="bubble-wrapper">
                <div className={`bubble ${isUser ? 'user' : 'ai'}`}>
                    {isUser ? (
                        message.content
                    ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    )}
                </div>

                {/* Meta information row */}
                <div className="message-meta">
                    <span>{formatTime(message.timestamp)}</span>

                    {/* AI-only metadata */}
                    {!isUser && message.retrievedChunks !== undefined && (
                        <>
                            {message.fallback ? (
                                <span className="meta-chip fallback">⚠ No match found</span>
                            ) : (
                                <>
                                    <span className="meta-chip">
                                        📄 {message.retrievedChunks} chunk{message.retrievedChunks !== 1 ? 's' : ''}
                                    </span>
                                    {message.tokensUsed > 0 && (
                                        <span className="meta-chip">
                                            🔢 {message.tokensUsed} tokens
                                        </span>
                                    )}
                                    {message.latencyMs && (
                                        <span className="meta-chip">
                                            ⚡ {message.latencyMs}ms
                                        </span>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

MessageBubble.propTypes = {
    message: PropTypes.shape({
        role: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        timestamp: PropTypes.string.isRequired,
        retrievedChunks: PropTypes.number,
        fallback: PropTypes.bool,
        tokensUsed: PropTypes.number,
        latencyMs: PropTypes.number,
    }).isRequired,
};
