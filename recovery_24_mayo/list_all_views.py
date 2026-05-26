import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        if tc.get("name") == "view_file" and "NnaCreatePage.tsx" in tc.get("args", {}).get("AbsolutePath", ""):
                            targs = tc["args"]
                            print(f"Line {idx} | Start: {targs.get('StartLine')} | End: {targs.get('EndLine')}")
            except Exception as e:
                pass
else:
    print("Transcript not found")
