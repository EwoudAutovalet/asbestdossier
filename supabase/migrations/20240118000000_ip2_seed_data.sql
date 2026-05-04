-- ============================================================
-- IP2 Seed Data: toepassingen en bindmiddelen
-- ============================================================

-- TOEPASSINGEN
INSERT INTO asbestos_applications (code, name, category, sort_order) VALUES
-- Dakbedekking
('DAK_GOLF', 'Golfplaten', 'Dakbedekking', 1),
('DAK_LEI', 'Leien', 'Dakbedekking', 2),
('DAK_SHINGLE', 'Dakshingles', 'Dakbedekking', 3),
('DAK_GOOT', 'Dakgoten', 'Dakbedekking', 4),
('DAK_SCHOUW', 'Schoorsteenafdekking', 'Dakbedekking', 5),
('DAK_ROOFING', 'Roofing/dakvilt', 'Dakbedekking', 6),
-- Gevelbekleding
('GEVEL_VLAK', 'Vlakke platen', 'Gevelbekleding', 10),
('GEVEL_SIDING', 'Sidings', 'Gevelbekleding', 11),
('GEVEL_PANEEL', 'Gevelpanelen', 'Gevelbekleding', 12),
('GEVEL_VENSTER', 'Vensterbanken', 'Gevelbekleding', 13),
('GEVEL_BOEI', 'Boeidelen', 'Gevelbekleding', 14),
('GEVEL_SCHOTEL', 'Schoorstenen (buiten)', 'Gevelbekleding', 15),
-- Leidingisolatie
('LEID_BUIS', 'Buisisolatie', 'Leidingisolatie', 20),
('LEID_KETEL', 'Ketelisolatie', 'Leidingisolatie', 21),
('LEID_KANAAL', 'Kanaalplaten/luchtkanalen', 'Leidingisolatie', 22),
-- Vloeren
('VLOER_VINYL', 'Vinyltegels', 'Vloeren', 30),
('VLOER_ONDER', 'Ondervloerplaat', 'Vloeren', 31),
('VLOER_NOVILON', 'Novilon/zeil', 'Vloeren', 32),
-- Isolatie & brandwerend
('ISO_SPUIT', 'Spuitasbest', 'Isolatie & brandwerend', 40),
('ISO_KARTON', 'Asbestkarton', 'Isolatie & brandwerend', 41),
('ISO_KOORD', 'Asbestkoord', 'Isolatie & brandwerend', 42),
('ISO_PAKKING', 'Pakkingen', 'Isolatie & brandwerend', 43),
('ISO_BRANDPLAAT', 'Brandwerende platen', 'Isolatie & brandwerend', 44),
-- Overig
('OVR_BLOEMBAK', 'Bloembakken', 'Overig', 50),
('OVR_BUIS_AFVOER', 'Afvoerbuizen', 'Overig', 51),
('OVR_LIJM', 'Asbestlijm/-kit', 'Overig', 52),
('OVR_TEXTIEL', 'Asbesttextiel/koorden', 'Overig', 53);

-- BINDMIDDELEN
INSERT INTO asbestos_binders (code, name, application_codes, is_hechtgebonden, sort_order) VALUES
('CEMENT', 'Asbestcement', ARRAY['DAK_GOLF','DAK_LEI','DAK_GOOT','DAK_SCHOUW','GEVEL_VLAK','GEVEL_SIDING','GEVEL_PANEEL','GEVEL_VENSTER','GEVEL_BOEI','GEVEL_SCHOTEL','LEID_BUIS','LEID_KANAAL','OVR_BLOEMBAK','OVR_BUIS_AFVOER'], true, 1),
('BITUMEN', 'Asbestbitumen', ARRAY['DAK_SHINGLE','DAK_ROOFING','VLOER_NOVILON'], true, 2),
('VINYL', 'Asbestvinyl', ARRAY['VLOER_VINYL','VLOER_NOVILON','VLOER_ONDER'], true, 3),
('SPUIT', 'Spuitasbest (losgebonden)', ARRAY['ISO_SPUIT','ISO_BRANDPLAAT'], false, 4),
('KARTON', 'Asbestkarton (losgebonden)', ARRAY['ISO_KARTON','ISO_PAKKING','LEID_KETEL'], false, 5),
('TEXTIEL', 'Asbesttextiel/koord (losgebonden)', ARRAY['ISO_KOORD','OVR_TEXTIEL','ISO_PAKKING'], false, 6),
('LIJM', 'Asbestlijm/-kit', ARRAY['OVR_LIJM','VLOER_VINYL'], true, 7);
