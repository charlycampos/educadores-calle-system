import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 19:
                data = json.loads(line)
                print(f"Line 19 | Step: {data.get('step_index')}")
                content = data.get("content", "")
                print(f"Content snippet (first 1000 chars):")
                print(content[:1000])
                break
else:
    print("Transcript not found")
