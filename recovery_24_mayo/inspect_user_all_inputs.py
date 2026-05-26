import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if data.get("type") == "USER_INPUT":
                print(f"--- STEP {data.get('step_index')} (Line {idx}) ---")
                if "content" in data:
                    print(f"Content length: {len(data['content'])}")
                    snippet = data['content']
                    if len(snippet) > 800:
                        snippet = snippet[:400] + "\n... (truncated) ...\n" + snippet[-400:]
                    print(snippet)
else:
    print("Transcript not found")
