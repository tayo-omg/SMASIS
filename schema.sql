-- ============================================================
-- SmaWaSIS Database Schema
-- PostgreSQL 15+
-- Run with: psql -U postgres -d smawasis -f schema.sql
-- ============================================================

-- Drop tables in reverse dependency order (for re-runs)
DROP TABLE IF EXISTS status_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS ward_zones CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50) UNIQUE NOT NULL,
  sla_hours  INT NOT NULL DEFAULT 48
);

-- ── WARD ZONES ───────────────────────────────────────────────
CREATE TABLE ward_zones (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(100) NOT NULL,
  boundary_description  TEXT
);

-- ── TEAMS ────────────────────────────────────────────────────
CREATE TABLE teams (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  ward_zone_id  INT REFERENCES ward_zones(id),
  contact_email VARCHAR(150)
);

-- Add FK back to teams from ward_zones (mutual reference resolved via ALTER)
ALTER TABLE ward_zones ADD COLUMN IF NOT EXISTS responsible_team_id INT REFERENCES teams(id);

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'contractor', 'admin')),
  team_id        INT REFERENCES teams(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LOCATIONS ────────────────────────────────────────────────
CREATE TABLE locations (
  id            SERIAL PRIMARY KEY,
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  address_text  TEXT,
  ward_zone_id  INT REFERENCES ward_zones(id)
);

-- ── TICKETS ──────────────────────────────────────────────────
CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  ticket_ref        VARCHAR(30) UNIQUE NOT NULL,
  reporter_id       INT NOT NULL REFERENCES users(id),
  category_id       INT NOT NULL REFERENCES categories(id),
  location_id       INT NOT NULL REFERENCES locations(id),
  assigned_team_id  INT REFERENCES teams(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','assigned','received','in_progress','cleared')),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

-- ── PHOTOS ───────────────────────────────────────────────────
CREATE TABLE photos (
  id           SERIAL PRIMARY KEY,
  ticket_id    INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMENTS ─────────────────────────────────────────────────
CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STATUS LOG ───────────────────────────────────────────────
CREATE TABLE status_log (
  id           SERIAL PRIMARY KEY,
  ticket_id    INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_status  VARCHAR(20),
  to_status    VARCHAR(20) NOT NULL,
  changed_by   INT REFERENCES users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_tickets_reporter    ON tickets(reporter_id);
CREATE INDEX idx_tickets_team        ON tickets(assigned_team_id);
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_tickets_created     ON tickets(created_at);
CREATE INDEX idx_tickets_category    ON tickets(category_id);
CREATE INDEX idx_locations_ward      ON locations(ward_zone_id);
CREATE INDEX idx_comments_ticket     ON comments(ticket_id);
CREATE INDEX idx_statuslog_ticket    ON status_log(ticket_id);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO categories (name, sla_hours) VALUES
  ('Uncollected Refuse', 48),
  ('Illegal Dumping', 72),
  ('Blocked Drain', 24),
  ('Other', 96);

INSERT INTO ward_zones (name, boundary_description) VALUES
  ('Ward 1 – North', 'Northern district, lat > 6.55'),
  ('Ward 2 – Central', 'Central district, 6.50 <= lat <= 6.55'),
  ('Ward 3 – South', 'Southern district, lat < 6.50'),
  ('Ward 4 – East', 'Eastern district, lon > 3.40'),
  ('Ward 5 – West', 'Western district, lon < 3.35');

INSERT INTO teams (name, ward_zone_id, contact_email) VALUES
  ('North Sanitation Unit', 1, 'ward1@smawasis.gov'),
  ('Central Sanitation Unit', 2, 'ward2@smawasis.gov'),
  ('South Sanitation Unit', 3, 'ward3@smawasis.gov'),
  ('East Sanitation Unit', 4, 'ward4@smawasis.gov'),
  ('West Sanitation Unit', 5, 'ward5@smawasis.gov');

UPDATE ward_zones SET responsible_team_id = 1 WHERE id = 1;
UPDATE ward_zones SET responsible_team_id = 2 WHERE id = 2;
UPDATE ward_zones SET responsible_team_id = 3 WHERE id = 3;
UPDATE ward_zones SET responsible_team_id = 4 WHERE id = 4;
UPDATE ward_zones SET responsible_team_id = 5 WHERE id = 5;
