import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if data.get("type") == "USER_INPUT":
                print(f"Step {data.get('step_index')} | User input keys: {list(data.keys())}")
                content_str = str(data.get("content", ""))
                print(f"  Content Len: {len(content_str)}")
                if "NnaCreatePage" in content_str:
                    print("  Found NnaCreatePage in this content!")
                break
else:
    print("Transcript not found")
