import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 352:
                data = json.loads(line)
                print(f"Line 352 | Step: {data.get('step_index')}")
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print(json.dumps(tc, indent=2))
else:
    print("Transcript not found")
