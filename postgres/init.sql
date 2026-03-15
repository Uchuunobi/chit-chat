-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for loading a conversation's messages in order
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Vector similarity search index using cosine distance
CREATE INDEX idx_messages_embedding ON messages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);