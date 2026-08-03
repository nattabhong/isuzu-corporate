-- Migration 002: Add CRM enhancements (fleet_contract_expiry, zone, lost_reason, competitor_brand, discount_amount)
ALTER TABLE customers ADD COLUMN fleet_contract_expiry TEXT;
ALTER TABLE customers ADD COLUMN zone TEXT;

ALTER TABLE deals ADD COLUMN lost_reason TEXT;
ALTER TABLE deals ADD COLUMN competitor_brand TEXT;
ALTER TABLE deals ADD COLUMN discount_amount REAL;
