// ─── DOM refs ──────────────────────────────────────────
const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');

let scrollAnchor = document.getElementById('scroll-anchor');

// ─── State ─────────────────────────────────────────────
let conversationId = null;
let isStreaming = false;

// ─── Theme ─────────────────────────────────────────────
document.documentElement.setAttribute('data-theme', 'dark');
themeToggle.textContent = 'LIGHT';

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.textContent = isDark ? 'DARK' : 'LIGHT';
});

// ─── Sidebar toggle ────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// ─── Helpers ───────────────────────────────────────────
function appendMessage(role, text) {
    const div = document.createElement('div');
    div.classList.add('message', role);
    div.textContent = text;
    messagesDiv.insertBefore(div, scrollAnchor);
    scrollToBottom();
    return div;
}

function clearMessages() {
    messagesDiv.innerHTML = '<div id="scroll-anchor"></div>';
    scrollAnchor = document.getElementById('scroll-anchor');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function scrollToBottom(instant = false) {
    if(!instant) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } 
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
    });
}

// ─── Conversation list ─────────────────────────────────
async function loadConversationList() {
    try {
        const response = await fetch('/api/conversations');
        const conversations = await response.json();

        conversationList.innerHTML = '';

        if (conversations.length === 0) {
            conversationList.innerHTML = `
                <div class="conversation-empty">
                    no conversations yet.<br>start chatting!
                </div>`;
            return;
        }

        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.classList.add('conversation-item');
            if (conv.id === conversationId) item.classList.add('active');

            item.innerHTML = `
                <div class="conversation-summary">
                    ${conv.summary || 'new conversation'}
                </div>
                <div class="conversation-meta">
                    <span>${conv.message_count} messages</span>
                    <span>${formatDate(conv.created_at)}</span>
                </div>`;

            item.addEventListener('click', () => selectConversation(conv.id));
            conversationList.appendChild(item);
        });

    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

function setActiveConversationInList(id) {
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });

    // Find and mark the active item
    const items = document.querySelectorAll('.conversation-item');
    const conversations = document.querySelectorAll('.conversation-summary');
    conversations.forEach((summary, index) => {
        if (items[index].dataset.id === id) {
            items[index].classList.add('active');
        }
    });
}

async function selectConversation(id) {
    if (isStreaming) return;
    if (id === conversationId) return;

    conversationId = id;
    clearMessages();

    try {
        const response = await fetch(`/api/conversations/${id}/messages`);
        const messages = await response.json();

        messages.forEach(msg => appendMessage(msg.role, msg.content));

        // Mark active in sidebar
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });

        // Re-render list to update active state
        await loadConversationList();

        // Close sidebar on mobile after selecting
        if (window.innerWidth <= 640) {
            sidebar.classList.add('collapsed');
        }

    } catch (err) {
        console.error('Failed to load conversation:', err);
    }
}

// ─── New chat ──────────────────────────────────────────
newChatBtn.addEventListener('click', () => {
    if (isStreaming) return;
    conversationId = null;
    clearMessages();
    userInput.focus();

    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
});

// ─── Send message ──────────────────────────────────────
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isStreaming) return;

    appendMessage('user', text);
    userInput.value = '';
    sendBtn.disabled = true;
    isStreaming = true;

    const replyDiv = appendMessage('assistant', '');
    replyDiv.classList.add('thinking');
    let thinkingRemoved = false;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId, message: text })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let convIdReceived = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            if (!convIdReceived) {
                buffer += chunk;
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) continue;

                const firstLine = buffer.substring(0, newlineIndex);
                const remainder = buffer.substring(newlineIndex + 1);
                convIdReceived = true;

                if (firstLine.startsWith('__CONV_ID__')) {
                    conversationId = firstLine.replace('__CONV_ID__', '').trim();
                }

                if (remainder) {
                    if (!thinkingRemoved) {
                        replyDiv.classList.remove('thinking');
                        thinkingRemoved = true;
                    }
                    replyDiv.textContent += remainder;
                }

                buffer = '';
                continue;
            }

            if (!thinkingRemoved) {
                replyDiv.classList.remove('thinking');
                thinkingRemoved = true;
            }

            replyDiv.textContent += chunk;
            scrollToBottom(true);
        }

    } catch (err) {
        replyDiv.classList.remove('thinking');
        replyDiv.textContent = 'Error: could not reach the server.';
    } finally {
        sendBtn.disabled = false;
        isStreaming = false;

        // Refresh sidebar to show new conversation or updated message count
        await loadConversationList();
    }
}

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) sendMessage();
});

// ─── Init ──────────────────────────────────────────────
loadConversationList();