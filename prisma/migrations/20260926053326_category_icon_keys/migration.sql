-- Category icons are now SVG icon keys (see src/components/ui/icons.tsx)
-- instead of emoji characters.
UPDATE "ServiceCategory" SET "icon" = CASE "slug"
  WHEN 'general-vet' THEN 'stethoscope'
  WHEN 'vaccination' THEN 'syringe'
  WHEN 'emergency' THEN 'siren'
  WHEN 'dental' THEN 'smile'
  WHEN 'surgery' THEN 'hospital'
  WHEN 'diagnostics' THEN 'microscope'
  WHEN 'physical-therapy' THEN 'footprints'
  WHEN 'exotic-reptile' THEN 'turtle'
  WHEN 'avian' THEN 'bird'
  WHEN 'behaviour' THEN 'brain'
  WHEN 'nutrition' THEN 'salad'
  WHEN 'dermatology' THEN 'droplets'
  WHEN 'grooming' THEN 'scissors'
  WHEN 'bath' THEN 'bath'
  WHEN 'haircut' THEN 'scissors'
  WHEN 'nail-trim' THEN 'hand'
  WHEN 'teeth-cleaning' THEN 'brush'
  WHEN 'deshedding' THEN 'wind'
  ELSE "icon"
END;

-- Any remaining emoji icons (e.g. admin-created categories) fall back to the
-- default icon for the category's kind.
UPDATE "ServiceCategory" SET "icon" = NULL WHERE "icon" IS NOT NULL AND "icon" !~ '^[a-z-]+$';
