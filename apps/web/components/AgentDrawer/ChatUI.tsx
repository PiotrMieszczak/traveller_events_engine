'use client'

import { MessageList, ChatInput, ConnectionStatus } from 'chat-ag-ui'
import type { Message } from 'chat-ag-ui'
import classes from './ChatUI.module.css'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`${classes.bubble} ${isUser ? classes.userBubble : classes.agentBubble}`}>
      <span className={classes.role}>{isUser ? 'YOU' : 'AGENT'}</span>
      <p className={classes.text}>{message.content}</p>
    </div>
  )
}

export default function ChatUI() {
  return (
    <div className={classes.chatUI}>
      {/* Connection status bar */}
      <ConnectionStatus>
        {({ status }) => (
          <div className={`${classes.statusBar} ${classes[`status_${status}`]}`}>
            <span className={classes.statusDot} />
            <span className={classes.statusText}>{status}</span>
          </div>
        )}
      </ConnectionStatus>

      {/* Message list */}
      <MessageList className={classes.messageList} autoScroll>
        {({ messages, isStreaming }) => (
          <>
            {messages.length === 0 && (
              <div className={classes.emptyState}>
                Ask about the doom clock, entities, or hex systems…
              </div>
            )}
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && (
              <div className={classes.typingIndicator}>
                <span /><span /><span />
              </div>
            )}
          </>
        )}
      </MessageList>

      {/* Input */}
      <ChatInput placeholder="Ask the agent…" submitOnEnter>
        {({ value, onChange, onKeyDown, onSubmit, isDisabled, placeholder }) => (
          <form className={classes.inputRow} onSubmit={onSubmit}>
            <input
              className={classes.input}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isDisabled}
              placeholder={placeholder}
              autoComplete="off"
            />
            <button
              type="submit"
              className={classes.sendButton}
              disabled={isDisabled || !value.trim()}
            >
              Send
            </button>
          </form>
        )}
      </ChatInput>
    </div>
  )
}
