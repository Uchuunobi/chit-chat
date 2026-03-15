import pg from 'pg';

const pool = new pg.Pool();

pool.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to PostgreSQL');
    }
});

export async function createConversation() {
    const result = await pool.query(
        'INSERT INTO conversations DEFAULT VALUES RETURNING id'
    );
    return result.rows[0].id;
}

export async function updateConversationSummary(conversationId, summary) {
    await pool.query(
        'UPDATE conversations SET summary = $1 WHERE id = $2',
        [summary, conversationId]
    );
}

export async function getConversations() {
    const result = await pool.query(
        `SELECT 
            c.id,
            c.summary,
            c.created_at,
            COUNT(m.id) AS message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at DESC`
    );
    return result.rows;
}

export async function getConversationMessages(conversationId) {
    const result = await pool.query(
        `SELECT role, content
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
    );
    return result.rows;
}

export async function saveMessage(conversationId, role, content) {
    const result = await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [conversationId, role, content]
    );
    return result.rows[0].id;
}

export async function updateMessageEmbedding(messageId, embedding) {
    await pool.query(
        'UPDATE messages SET embedding = $1 WHERE id = $2',
        [`[${embedding.join(',')}]`, messageId]
    );
}

export async function getRecentMessages(conversationId, limit = 10) {
    const result = await pool.query(
        `SELECT role, content
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, limit]
    );
    return result.rows.reverse();
}

export async function getSimilarMessages(conversationId, embedding, limit = 5) {
    const result = await pool.query(
        `SELECT role, content
         FROM messages
         WHERE conversation_id = $1
         AND embedding IS NOT NULL
         AND id NOT IN (
             SELECT id FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT 10
         )
         ORDER BY embedding <=> $2
         LIMIT $3`,
        [conversationId, `[${embedding.join(',')}]`, limit]
    );
    return result.rows;
}

export async function getMessageCount(conversationId) {
    const result = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
        [conversationId]
    );
    return parseInt(result.rows[0].count);
}