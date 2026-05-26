import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if "Showing lines 2000 to" in line or "Showing lines 2000" in line:
                try:
                    data = json.loads(line)
                    print(f"Match found at line {idx} | Source: {data.get('source')}")
                    print(data.get("content")[:1000])
                    break
                except Exception as e:
                    pass
else:
    print("Transcript not found")
