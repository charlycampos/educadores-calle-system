import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    print("Reading step 33 and 37 of current session...")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx in [31, 35]: # Line index 31 and 35
                data = json.loads(line)
                print(f"\n========================================")
                print(f"Line {idx} | Source: {data.get('source')} | Type: {data.get('type')}")
                content = data.get("content", "")
                print(f"Content length: {len(content)}")
                if content:
                    print("First 200 chars:")
                    print(content[:200])
                    print("Last 200 chars:")
                    print(content[-200:])
else:
    print("Transcript not found")
