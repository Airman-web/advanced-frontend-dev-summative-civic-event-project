-- Service requests: residents report city issues; admins track them to resolution.
CREATE TABLE IF NOT EXISTS service_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,                       -- one of SERVICE_TYPES (src/utils/serviceTypes.js)
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
    admin_note TEXT,                                  -- visible to the resident
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_user ON service_requests(user_id);
