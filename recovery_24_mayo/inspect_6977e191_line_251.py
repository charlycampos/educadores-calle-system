import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 252:
                data = json.loads(line)
                content = data.get("content", "")
                lines = content.splitlines()
                print("Lines around 3350-3380 in Line 252 content:")
                for l in lines:
                    if any(f"{num}:" in l for num in range(3350, 3381)):
                        print(l)
                break
else:
    print("Transcript not found")
