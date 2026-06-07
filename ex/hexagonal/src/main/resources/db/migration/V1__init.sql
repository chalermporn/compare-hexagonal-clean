-- Flyway migration V1: schema + a tiny seed catalog.
-- Column names are snake_case to match Micronaut Data's default naming strategy
-- (camelCase property -> under_score column).

CREATE TABLE customers (
    id    VARCHAR(64)  PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    name  VARCHAR(200) NOT NULL
);

CREATE TABLE products (
    id          VARCHAR(64)  PRIMARY KEY,
    category_id VARCHAR(64)  NOT NULL,
    name        VARCHAR(200) NOT NULL,
    price_cents BIGINT       NOT NULL CHECK (price_cents >= 0)
);

CREATE INDEX idx_products_category ON products (category_id);

-- Seed: tiny catalog (the real system has ~1K products / 100 categories).
INSERT INTO products (id, category_id, name, price_cents) VALUES
  ('p1', 'c1', 'Coffee Mug',  19900),
  ('p2', 'c1', 'Tea Cup',     14900),
  ('p3', 'c2', 'Notebook',     9900),
  ('p4', 'c2', 'Ballpoint Pen', 2900);
