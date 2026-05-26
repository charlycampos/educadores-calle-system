import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 124:
                data = json.loads(line)
                print(f"Line 124 | Step: {data.get('step_index')}")
                content = data.get("content", "")
                print("Content snippet (around line 2320-2340):")
                lines = content.splitlines()
                for l in lines:
                    if "2320:" in l or "2325:" in l or "2330:" in l:
                        print(l)
                break
else:
    print("Transcript not found")
