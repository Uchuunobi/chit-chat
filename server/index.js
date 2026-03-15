import express from 'express';
import {
    createConversation,
    updateConversationSummary,
    getConversations,
    getConversationMessages,
    saveMessage,
    updateMessageEmbedding,
    getRecentMessages,
    getSimilarMessages,
    getMessageCount
} from './db.js';
import { generateEmbedding, generateSummary, buildContext } from './embeddings.js';

const app = express();
app.use(express.json());

const OLLAMA_URL = 'http://ollama:11434';

function trimToLastCompleteSentence(text) {
    const match = text.match(/(.*[.!?])[^.!?]*$/s);
    return match ? match[1].trim() : text;
}

// Get all conversations for the sidebar
app.get('/conversations', async (req, res) => {
    try {
        const conversations = await getConversations();
        res.json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
});

// Get all messages for a specific conversation
app.get('/conversations/:id/messages', async (req, res) => {
    try {
        const messages = await getConversationMessages(req.params.id);
        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err.message);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

app.post('/chat', async (req, res) => {
    const { conversationId, message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message is required' });
    }

    try {
        // Use existing conversation or create a new one
        let convId = conversationId;
        if (!convId) {
            convId = await createConversation();
        }

        // Check if this is the first message in the conversation
        const messageCount = await getMessageCount(convId);
        const isFirstMessage = messageCount === 0;

        // Generate embedding for the incoming user message
        const userEmbedding = await generateEmbedding(message);

        // Save user message and get its id
        const userMessageId = await saveMessage(convId, 'user', message);

        // Save embedding if generation succeeded
        if (userEmbedding) {
            await updateMessageEmbedding(userMessageId, userEmbedding);
        }

        // Load recent messages verbatim — the recent tier
        const recentMessages = await getRecentMessages(convId, 10);

        // Load semantically relevant older messages — the RAG tier
        let similarMessages = [];
        if (userEmbedding) {
            similarMessages = await getSimilarMessages(convId, userEmbedding, 5);
        }

        // Combine into a single context array
        const context = buildContext(recentMessages, similarMessages);

        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant. Always finish with a complete sentence.'
            },
            ...context,
            { role: 'user', content: message }
        ];

        // Estimate tokens and log context size
        const contextText = messages.map(m => m.content).join(' ');
        const estimatedTokens = Math.ceil(contextText.length / 4);
        console.log(`Context messages: ${messages.length}, estimated tokens: ${estimatedTokens}`);

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3:latest',
                stream: true,
                messages,
                options: {
                    num_predict: 256
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama responded with status ${response.status}`);
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send conversation id to frontend first
        res.write(`__CONV_ID__${convId}\n`);

        // Stream tokens from Ollama to the browser
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const token = json.message?.content || '';
                    if (token) {
                        fullReply += token;
                        res.write(token);
                    }
                } catch {
                    // skip malformed lines
                }
            }
        }

        res.end();

        // Save assistant reply and its embedding after streaming completes
        const trimmedReply = trimToLastCompleteSentence(fullReply);
        const assistantMessageId = await saveMessage(convId, 'assistant', trimmedReply);
        const assistantEmbedding = await generateEmbedding(trimmedReply);
        if (assistantEmbedding) {
            await updateMessageEmbedding(assistantMessageId, assistantEmbedding);
        }

        // Generate and save summary if this was the first message
        if (isFirstMessage) {
            const summary = await generateSummary(message);
            if (summary) {
                await updateConversationSummary(convId, summary);
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});