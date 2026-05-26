import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx > 130:
                break
            try:
                data = json.loads(line)
                print(f"Line {idx} | Source: {data.get('source')} | Type: {data.get('type')}")
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print(f"  Tool Call: {tc.get('name')} | Args: {tc.get('args')}")
                if data.get("source") == "SYSTEM" and "content" in data:
                    content_str = str(data["content"])
                    print(f"  System Response Len: {len(content_str)} | Snippet: {content_str[:150]}")
            except Exception as e:
                pass
else:
    print("Transcript not found")
