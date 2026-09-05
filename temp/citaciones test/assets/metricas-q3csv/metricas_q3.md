---
source_file: "sources/original/metricas_q3.csv"
sha256: "d9a1dd85db9753a706dda824fb8d3117e4b8ed7cfb0682625f598b980febd24d"
size_bytes: 225
normalized_at: "2026-09-05T10:54:10.140Z"
normalized_by: "traNNsform v1.0.0"
---

# NN Dataset Schema: metricas_q3

| Column | Inferred Type | Null Count | Summary Metrics |
|---|---|---|---|
| cliente_id | integer | 0 | min: 101, max: 105, avg: 103.00 |
| segmento | string | 0 | - |
| unidades_activas | integer | 0 | min: 15, max: 210, avg: 94.00 |
| mrr_usd | integer | 0 | min: 5500, max: 78000, avg: 35100.00 |
| fecha_alta | date | 0 | - |

## NN Summary Statistics

- **Total Rows**: 5
- **Total Columns**: 5
- **Columns**: cliente_id, segmento, unidades_activas, mrr_usd, fecha_alta

## NN Sample Data (First 5 Rows)

| cliente_id | segmento | unidades_activas | mrr_usd | fecha_alta |
| --- | --- | --- | --- | --- |
| 101 | Enterprise | 120 | 45000 | 2025-01-15 |
| 102 | Enterprise | 85 | 32000 | 2025-02-20 |
| 103 | Mid-Market | 40 | 15000 | 2025-03-10 |
| 104 | Enterprise | 210 | 78000 | 2025-04-05 |
| 105 | SMB | 15 | 5500 | 2025-05-12 |
