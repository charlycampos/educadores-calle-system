import json
import glob
import os

logs_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\1bfa64e4-486d-4ba0-bf78-fc95ba0326b6\.system_generated\logs\transcript_full.jsonl"
output_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\recovered_nna_create.tsx"

with open(logs_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'Total Lines: 3634' in content and 'NnaCreatePage.tsx' in content:
                with open(output_path, 'w', encoding='utf-8') as out_f:
                    out_f.write(content)
                print("Found and extracted the view_file block!")
                break
        except Exception as e:
            pass
