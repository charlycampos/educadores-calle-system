import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if data.get("type") == "VIEW_FILE":
                print(f"Keys: {list(data.keys())}")
                print(f"Source: {data.get('source')} | Status: {data.get('status')}")
                content = data.get("content", "")
                print(f"Content snippet:\n{content[:300]}")
                break
else:
    print("Transcript not found")
