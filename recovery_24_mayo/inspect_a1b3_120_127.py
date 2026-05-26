import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx >= 120 and idx <= 127:
                data = json.loads(line)
                print(f"Line {idx} | Source: {data.get('source')} | Type: {data.get('type')}")
                content = data.get("content", "")
                print(f"  Content Len: {len(content)}")
                if content:
                    print(f"  Content snippet:\n{content[:200]}")
else:
    print("Transcript not found")
