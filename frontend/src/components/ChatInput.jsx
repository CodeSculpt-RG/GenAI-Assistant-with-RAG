import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function ChatInput({ onSend, isLoading }) {
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

    // Auto-resize textarea up to ~5 lines
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [text]);

    function handleSubmit() {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;
        onSend(trimmed);
        setText('');
        // Reset height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    function handleKeyDown(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    return (
        <div className="input-area">
            <div className="input-row">
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your account, billing, or features…"
                    disabled={isLoading}
                    rows={1}
                    id="chat-input"
                />
                <button
                    className="send-btn"
                    onClick={handleSubmit}
                    disabled={isLoading || !text.trim()}
                    aria-label="Send message"
                    id="send-button"
                >
                    {isLoading ? '⏳' : '➤'}
                </button>
            </div>
            <div className="input-footer">
                Press <kbd style={{ background: 'var(--bg-input)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border)' }}>Enter</kbd> to send &nbsp;·&nbsp; Shift+Enter for new line
            </div>
        </div>
    );
}

ChatInput.propTypes = {
    onSend: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
};
