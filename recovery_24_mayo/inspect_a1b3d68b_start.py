import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx > 105:
                break
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        if "NnaCreatePage.tsx" in str(tc):
                            print(f"Line {idx} | Tool: {tc.get('name')} | Args: {tc.get('args')}")
            except Exception as e:
                pass
else:
    print("Transcript not found")
