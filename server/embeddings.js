const OLLAMA_URL = 'http://ollama:11434';

export async function generateEmbedding(text) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: text
            })
        });

        if (!response.ok) {
            throw new Error(`Embedding request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.embedding;

    } catch (err) {
        console.error('Embedding error:', err.message);
        return null;
    }
}

export async function generateSummary(text) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3:latest',
                stream: false,
                messages: [
                    {
                        role: 'system',
                        content: 'You generate extremely brief conversation titles. Respond with only 4-6 words that capture the topic. No punctuation, no quotes, no explanation. Examples: "Docker container networking setup", "Python sorting algorithm help", "French cooking techniques"'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                options: {
                    num_predict: 20
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Summary request failed with status ${response.status}`);
        }

        const data = await response.json();
        const summary = data.message?.content?.trim();

        // Truncate to 100 chars just in case the model ignores instructions
        return summary ? summary.substring(0, 100) : null;

    } catch (err) {
        console.error('Summary error:', err.message);
        return null;
    }
}

export function buildContext(recentMessages, similarMessages) {
    const recentContents = new Set(recentMessages.map(m => m.content));

    const uniqueSimilar = similarMessages.filter(
        m => !recentContents.has(m.content)
    );

    const context = [];

    if (uniqueSimilar.length > 0) {
        context.push({
            role: 'system',
            content: `The following messages from earlier in the conversation are relevant to the current question:\n\n${uniqueSimilar
                .map(m => `${m.role}: ${m.content}`)
                .join('\n')}`
        });
    }

    context.push(...recentMessages);

    return context;
}