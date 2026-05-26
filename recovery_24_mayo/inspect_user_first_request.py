import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if data.get("type") == "USER_INPUT":
                print(f"Step {data.get('step_index')} | User input keys: {list(data.keys())}")
                if "content" in data:
                    print(f"  Content Len: {len(data['content'])}")
                    print(f"  Snippet:\n{data['content'][:1000]}")
                break
else:
    print("Transcript not found")
