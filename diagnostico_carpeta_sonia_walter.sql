-- =====================================================================
-- DIAGNÓSTICO: ¿SONIA CARPIO MESTANZA y WALTER LOPEZ VEGA están
-- correctamente agrupados en la misma carpeta (NNA_CARPETA)?
--
-- Conexión: usuario sec_user / servicio XEPDB1 (Oracle XE, localhost:1521)
-- Tablas: NNA, NNA_CARPETA, NNA_FAMILIAR, NNA_CASO
--
-- Una "carpeta" = unidad familiar. Dos NNA con apellidos distintos
-- (CARPIO MESTANZA vs LOPEZ VEGA) NO deberían compartir carpeta salvo
-- que sean familia real (medios hermanos, mismo hogar, etc.).
-- =====================================================================

SET LINESIZE 200
SET PAGESIZE 100
COLUMN NOMBRES        FORMAT A20
COLUMN APELLIDO_PATERNO FORMAT A18
COLUMN APELLIDO_MATERNO FORMAT A18
COLUMN CODIGO         FORMAT A18
COLUMN PARENTESCO     FORMAT A15

-- ---------------------------------------------------------------------
-- PASO 1. Ubicar a ambos NNA y ver su CARPETA_ID
--   (búsqueda insensible a tildes, igual que hace el backend)
-- ---------------------------------------------------------------------
PROMPT === PASO 1: Los dos NNA y su carpeta ===
SELECT n.ID,
       n.NOMBRES,
       n.APELLIDO_PATERNO,
       n.APELLIDO_MATERNO,
       n.NUMERO_DOC,
       n.CARPETA_ID,
       c.CODIGO,
       c.SEDE_ID,
       n.CREATED_AT
FROM   NNA n
LEFT   JOIN NNA_CARPETA c ON c.ID = n.CARPETA_ID
WHERE  TRANSLATE(UPPER(n.APELLIDO_PATERNO), 'ÁÉÍÓÚÑ', 'AEIOUN') IN ('CARPIO', 'LOPEZ')
   AND TRANSLATE(UPPER(n.APELLIDO_MATERNO), 'ÁÉÍÓÚÑ', 'AEIOUN') IN ('MESTANZA', 'VEGA')
ORDER  BY n.ID;

-- ---------------------------------------------------------------------
-- PASO 2. Listar TODOS los NNA que comparten esa(s) carpeta(s)
--   Si en la misma CARPETA_ID aparecen ambos apellidos distintos,
--   la agrupación es sospechosa.
-- ---------------------------------------------------------------------
PROMPT === PASO 2: Todos los NNA dentro de la(s) carpeta(s) implicada(s) ===
SELECT n.ID,
       n.NOMBRES,
       n.APELLIDO_PATERNO,
       n.APELLIDO_MATERNO,
       n.NUMERO_DOC,
       n.CARPETA_ID,
       c.CODIGO,
       c.SEDE_ID
FROM   NNA n
JOIN   NNA_CARPETA c ON c.ID = n.CARPETA_ID
WHERE  n.CARPETA_ID IN (
          SELECT n2.CARPETA_ID
          FROM   NNA n2
          WHERE (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'CARPIO'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'MESTANZA')
             OR (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'LOPEZ'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'VEGA')
       )
ORDER  BY n.CARPETA_ID, n.ID;

-- ---------------------------------------------------------------------
-- PASO 3. Familiares declarados en esa(s) carpeta(s)
--   Ayuda a decidir si realmente son una familia (mismo apoderado/
--   parentesco) o si fue un error de registro.
-- ---------------------------------------------------------------------
PROMPT === PASO 3: Familiares registrados en la(s) carpeta(s) ===
SELECT f.CARPETA_ID,
       f.NOMBRES,
       f.PARENTESCO,
       f.DNI,
       f.VIVE_CON
FROM   NNA_FAMILIAR f
WHERE  f.CARPETA_ID IN (
          SELECT n2.CARPETA_ID
          FROM   NNA n2
          WHERE (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'CARPIO'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'MESTANZA')
             OR (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'LOPEZ'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'VEGA')
       )
ORDER  BY f.CARPETA_ID;

-- ---------------------------------------------------------------------
-- PASO 4. Casos (NNA_CASO) asociados, para no separar a ciegas
-- ---------------------------------------------------------------------
PROMPT === PASO 4: Casos por NNA ===
SELECT ca.NNA_ID,
       n.NOMBRES,
       n.APELLIDO_PATERNO,
       ca.CODIGO_CASO,
       ca.ESTADO,
       ca.SEDE_ID
FROM   NNA_CASO ca
JOIN   NNA n ON n.ID = ca.NNA_ID
WHERE  ca.NNA_ID IN (
          SELECT n2.ID
          FROM   NNA n2
          WHERE (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'CARPIO'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'MESTANZA')
             OR (TRANSLATE(UPPER(n2.APELLIDO_PATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'LOPEZ'
                 AND TRANSLATE(UPPER(n2.APELLIDO_MATERNO),'ÁÉÍÓÚÑ','AEIOUN') = 'VEGA')
       )
ORDER  BY ca.NNA_ID;


-- =====================================================================
-- CÓMO INTERPRETAR
-- =====================================================================
-- A) Si en el PASO 1 cada NNA tiene un CARPETA_ID DISTINTO:
--    -> Los datos están bien. El problema era solo el del frontend (ya
--       corregido). No hagas nada más aquí.
--
-- B) Si ambos comparten el MISMO CARPETA_ID (PASO 2 muestra ambos
--    apellidos en una sola carpeta) y NO son familia real (PASO 3 no
--    muestra parentesco que los una):
--    -> Fue un error de registro: SONIA quedó pegada a la carpeta de
--       WALTER. Hay que moverla a una carpeta nueva propia.
--
-- =====================================================================
-- CORRECCIÓN (SOLO si aplica el caso B). Revisa con SELECT antes.
-- Reemplaza los valores entre < > con los IDs reales del PASO 1/2.
-- HAZLO EN UNA TRANSACCIÓN Y CON RESPALDO.
-- =====================================================================
--
-- -- 1) Crear una carpeta nueva para SONIA (usa el ANIO y SEDE_ID que
-- --    correspondan; toma el siguiente CORRELATIVO de su sede):
-- INSERT INTO NNA_CARPETA (ANIO, CORRELATIVO, SEDE_ID)
-- VALUES (<ANIO>,
--         (SELECT NVL(MAX(CORRELATIVO),0)+1 FROM NNA_CARPETA
--          WHERE ANIO = <ANIO> AND SEDE_ID = <SEDE_ID> AND CORRELATIVO > 0),
--         <SEDE_ID>);
-- -- Anota el ID generado de esa carpeta (SELECT MAX(ID) FROM NNA_CARPETA ...).
--
-- -- 2) Reasignar a SONIA a su carpeta nueva:
-- UPDATE NNA SET CARPETA_ID = <NUEVA_CARPETA_ID>
-- WHERE  ID = <ID_SONIA>;
--
-- -- 3) Si había familiares de SONIA mal cargados bajo la carpeta de
-- --    WALTER, reasignarlos también:
-- -- UPDATE NNA_FAMILIAR SET CARPETA_ID = <NUEVA_CARPETA_ID>
-- -- WHERE  ID IN (<ids_familiares_de_sonia>);
--
-- COMMIT;   -- solo si todo lo verificaste antes
-- =====================================================================
