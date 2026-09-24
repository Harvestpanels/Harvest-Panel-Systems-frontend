-- psql convenience entry point for a NEW Supabase database only.
-- Existing installations: follow README.md; do not replay the baseline.
\set ON_ERROR_STOP on
\ir migrations/20260924000100_baseline.sql
\ir migrations/20260924000200_hardening.sql
