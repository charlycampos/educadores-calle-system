import os
import json

tpath = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(tpath):
    with open(tpath, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx + 1 == 30: # 1-indexed line 30 is index 29
                data = json.loads(line)
                print(f"Line 30 | Source: {data.get('source')} | Type: {data.get('type')} | Keys: {list(data.keys())}")
                if "content" in data:
                    print(f"Content snippet: {data['content'][:500]}")
                break
else:
    print("Transcript not found.")
