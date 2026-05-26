import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 251:
                data = json.loads(line)
                print(f"Line 251 | Step: {data.get('step_index')}")
                content = data.get("content", "")
                print("Content snippet (first 1000 chars):")
                print(content[:1000])
                print("\nContent snippet (around line 3350-3380):")
                # Let's find lines in this range
                lines = content.splitlines()
                for l in lines:
                    if "3350:" in l or "3360:" in l or "3370:" in l or "3380:" in l:
                        print(l)
                break
else:
    print("Transcript not found")
