# Documentation

## mappings/

Register → UI yönlendirme dokümanları. Modbus register adreslerinden web arayüzündeki bileşenlere tam eşleştirme.

| File | Description |
|------|-------------|
| `register-ui-mapping.json` | Machine-readable mapping (612 rows) |
| `register-ui-mapping.csv` | Excel-compatible, UTF-8 |

**Regenerate:**

```bash
python3 scripts/generate_register_mapping.py
python3 scripts/convert_to_xlsx.py          # .xlsx (needs `pip install openpyxl`)
```
