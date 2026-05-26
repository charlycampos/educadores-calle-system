-- ============================================================
-- MIGRACIÓN 003 — Mapeo Oficial de Sedes (SEC 2026)
-- Oracle: MERGE para idempotencia y preservación de IDs existentes.
-- Resolviendo ORA-12899 usando '404-C' (longitud 5 <= 10) para Sede Central.
-- ============================================================

ALTER SESSION SET CURRENT_SCHEMA = SEC_USER;

-- 1. Actualización y migración de Sedes Existentes por llave primaria (ID)
-- Preserva relaciones de clave foránea existentes y actualiza códigos y nombres oficiales.

-- ID 1: LIMA (Región LIMA - Código 404)
MERGE INTO SEC_SEDE t USING (SELECT 1 id, '404' codigo, 'LIMA' nombre, 1 region_id, 'CENTRO' region, 'Lima' departamento, 'Lima' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 2: HUARAL (Región HUARAL - Código 399)
MERGE INTO SEC_SEDE t USING (SELECT 2 id, '399' codigo, 'HUARAL' nombre, 1 region_id, 'CENTRO' region, 'Lima' departamento, 'Huaral' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 3: Callao (INACTIVA)
MERGE INTO SEC_SEDE t USING (SELECT 3 id, 'CAL-01' codigo, 'Callao' nombre, 2 region_id, 'CENTRO' region, 'Callao' departamento, 'Callao' provincia, 0 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 4: AREQUIPA (Región AREQUIPA - Código 391)
MERGE INTO SEC_SEDE t USING (SELECT 4 id, '391' codigo, 'AREQUIPA' nombre, 3 region_id, 'SUR' region, 'Arequipa' departamento, 'Arequipa' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 5: LA LIBERTAD (Región LA LIBERTAD - Código 409)
MERGE INTO SEC_SEDE t USING (SELECT 5 id, '409' codigo, 'LA LIBERTAD' nombre, 4 region_id, 'NORTE' region, 'La Libertad' departamento, 'Trujillo' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 6: LAMBAYEQUE (Región LAMBAYEQUE - Código 402)
MERGE INTO SEC_SEDE t USING (SELECT 6 id, '402' codigo, 'LAMBAYEQUE' nombre, 5 region_id, 'NORTE' region, 'Lambayeque' departamento, 'Chiclayo' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 7: CAJAMARCA (Región CAJAMARCA - Código 393)
MERGE INTO SEC_SEDE t USING (SELECT 7 id, '393' codigo, 'CAJAMARCA' nombre, 6 region_id, 'NORTE' region, 'Cajamarca' departamento, 'Cajamarca' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 8: JAÉN (Región JAÉN - Código 732)
MERGE INTO SEC_SEDE t USING (SELECT 8 id, '732' codigo, 'JAÉN' nombre, 21 region_id, 'NORTE' region, 'Cajamarca' departamento, 'Jaen' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 9: PIURA (Región PIURA - Código 406)
MERGE INTO SEC_SEDE t USING (SELECT 9 id, '406' codigo, 'PIURA' nombre, 7 region_id, 'NORTE' region, 'Piura' departamento, 'Piura' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 10: TUMBES (Región TUMBES - Código 544)
MERGE INTO SEC_SEDE t USING (SELECT 10 id, '544' codigo, 'TUMBES' nombre, 8 region_id, 'NORTE' region, 'Tumbes' departamento, 'Tumbes' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 11: CUSCO (Región CUSCO - Código 395)
MERGE INTO SEC_SEDE t USING (SELECT 11 id, '395' codigo, 'CUSCO' nombre, 9 region_id, 'SUR' region, 'Cusco' departamento, 'Cusco' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 12: PUNO (Región PUNO - Código 407)
MERGE INTO SEC_SEDE t USING (SELECT 12 id, '407' codigo, 'PUNO' nombre, 10 region_id, 'SUR' region, 'Puno' departamento, 'Puno' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 13: TACNA (Región TACNA - Código 408)
MERGE INTO SEC_SEDE t USING (SELECT 13 id, '408' codigo, 'TACNA' nombre, 11 region_id, 'SUR' region, 'Tacna' departamento, 'Tacna' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 14: ICA (Región ICA - Código 400)
MERGE INTO SEC_SEDE t USING (SELECT 14 id, '400' codigo, 'ICA' nombre, 12 region_id, 'SUR' region, 'Ica' departamento, 'Ica' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 15: AYACUCHO (Región AYACUCHO - Código 392)
MERGE INTO SEC_SEDE t USING (SELECT 15 id, '392' codigo, 'AYACUCHO' nombre, 13 region_id, 'CENTRO' region, 'Ayacucho' departamento, 'Huamanga' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 16: APURÍMAC (Región APURÍMAC - Código 371)
MERGE INTO SEC_SEDE t USING (SELECT 16 id, '371' codigo, 'APURÍMAC' nombre, 14 region_id, 'CENTRO' region, 'Apurimac' departamento, 'Abancay' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 17: JUNÍN (Región JUNÍN - Código 397)
MERGE INTO SEC_SEDE t USING (SELECT 17 id, '397' codigo, 'JUNÍN' nombre, 15 region_id, 'CENTRO' region, 'Junin' departamento, 'Huancayo' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 18: HUÁNUCO (Región HUÁNUCO - Código 398)
MERGE INTO SEC_SEDE t USING (SELECT 18 id, '398' codigo, 'HUÁNUCO' nombre, 16 region_id, 'NORTE' region, 'Huanuco' departamento, 'Huanuco' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 19: ANCASH (Región ÁNCASH - Código 394)
MERGE INTO SEC_SEDE t USING (SELECT 19 id, '394' codigo, 'ANCASH' nombre, 17 region_id, 'NORTE' region, 'Ancash' departamento, 'Santa' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 20: LORETO (Región LORETO - Código 401)
MERGE INTO SEC_SEDE t USING (SELECT 20 id, '401' codigo, 'LORETO' nombre, 18 region_id, 'ORIENTE' region, 'Loreto' departamento, 'Maynas' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 21: UCAYALI (Región UCAYALI - Código 552)
MERGE INTO SEC_SEDE t USING (SELECT 21 id, '552' codigo, 'UCAYALI' nombre, 19 region_id, 'ORIENTE' region, 'Ucayali' departamento, 'Coronel Portillo' provincia, 1 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.codigo=s.codigo, t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 22: Tarapoto (INACTIVA)
MERGE INTO SEC_SEDE t USING (SELECT 22 id, 'SAM-01' codigo, 'Tarapoto' nombre, 20 region_id, 'ORIENTE' region, 'San Martin' departamento, 'San Martin' provincia, 0 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 23: Chachapoyas (INACTIVA)
MERGE INTO SEC_SEDE t USING (SELECT 23 id, 'AMA-01' codigo, 'Chachapoyas' nombre, 21 region_id, 'ORIENTE' region, 'Amazonas' departamento, 'Chachapoyas' provincia, 0 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- ID 24: Sede Central Lima (INACTIVA)
MERGE INTO SEC_SEDE t USING (SELECT 24 id, '404-C' codigo, 'Sede Central Lima' nombre, 1 region_id, 'LIMA' region, 'LIMA' departamento, 'LIMA' provincia, 0 activo FROM DUAL) s ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);


-- 2. Nuevas Sedes por Código de Servicio (Unicidad garantizada)

-- Sede HUANCAVELICA (Región HUANCAVELICA - Código 396)
MERGE INTO SEC_SEDE t USING (SELECT '396' codigo, 'HUANCAVELICA' nombre, 22 region_id, 'CENTRO' region, 'Huancavelica' departamento, 'Huancavelica' provincia, 1 activo FROM DUAL) s ON (t.codigo = s.codigo)
WHEN MATCHED THEN UPDATE SET t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- Sede MOQUEGUA (Región MOQUEGUA - Código 403)
MERGE INTO SEC_SEDE t USING (SELECT '403' codigo, 'MOQUEGUA' nombre, 23 region_id, 'SUR' region, 'Moquegua' departamento, 'Mariscal Nieto' provincia, 1 activo FROM DUAL) s ON (t.codigo = s.codigo)
WHEN MATCHED THEN UPDATE SET t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

-- Sede PASCO (Región PASCO - Código 551)
MERGE INTO SEC_SEDE t USING (SELECT '551' codigo, 'PASCO' nombre, 24 region_id, 'CENTRO' region, 'Pasco' departamento, 'Pasco' provincia, 1 activo FROM DUAL) s ON (t.codigo = s.codigo)
WHEN MATCHED THEN UPDATE SET t.nombre=s.nombre, t.region_id=s.region_id, t.region=s.region, t.departamento=s.departamento, t.provincia=s.provincia, t.activo=s.activo
WHEN NOT MATCHED THEN INSERT (codigo,nombre,region_id,region,departamento,provincia,activo) VALUES (s.codigo,s.nombre,s.region_id,s.region,s.departamento,s.provincia,s.activo);

COMMIT;
