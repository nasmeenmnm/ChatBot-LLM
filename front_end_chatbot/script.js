class ChatBot {
    constructor() {
        this.apiUrl = 'http://localhost:8000/chat';
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key press
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-focus input
        this.messageInput.focus();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;

        // Disable input while sending
        this.setInputState(false);
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send request to backend
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response
            await this.handleStreamingResponse(response);
            
        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.addMessage(
                'Sorry, I encountered an error while processing your request. Please make sure the backend server is running and try again.',
                'bot',
                true
            );
        } finally {
            // Re-enable input
            this.setInputState(true);
        }
    }

    async handleStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Hide typing indicator and create bot message container
        this.hideTypingIndicator();
        const messageElement = this.addMessage('', 'bot');
        const contentElement = messageElement.querySelector('.message-content');
        
        let fullText = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                
                // Update the message content with markdown rendering
                contentElement.innerHTML = this.parseMarkdown(fullText);
                
                // Auto-scroll to bottom
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error reading stream:', error);
            contentElement.textContent = 'Error receiving response from the server.';
            messageElement.classList.add('error-message');
        }
    }

    addMessage(text, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (isError) {
            messageDiv.classList.add('error-message');
        }

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // For bot messages, parse markdown; for user messages, escape HTML
        const content = sender === 'bot' ? this.parseMarkdown(text) : this.escapeHtml(text);

        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${timeString}</div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        
        if (enabled) {
            this.messageInput.focus();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseMarkdown(text) {
        if (!text) return '';
        
        // Escape HTML first to prevent XSS
        let html = this.escapeHtml(text);
        
        // Parse markdown syntax
        // Headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        
        // Wrap in paragraph if not already wrapped
        if (!html.startsWith('<h') && !html.startsWith('<p') && !html.startsWith('<pre')) {
            html = '<p>' + html + '</p>';
        }
        
        // Lists
        html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Numbered lists
        html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
        
        return html;
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});

// Handle connection errors gracefully
window.addEventListener('online', () => {
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
});
