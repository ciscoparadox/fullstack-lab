-- migrations/001_init.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create moods table
CREATE TABLE moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    embedding REAL[] NULL
);

-- Create indexes
CREATE INDEX idx_moods_user_id_timestamp ON moods(user_id, timestamp);
CREATE INDEX idx_users_email ON users(email);
