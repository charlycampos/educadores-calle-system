import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 140:
                data = json.loads(line)
                print(f"Line 140 | Tool calls:")
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print(json.dumps(tc, indent=2))
else:
    print("Transcript not found")
