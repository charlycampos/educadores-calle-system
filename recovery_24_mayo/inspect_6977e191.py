import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    print("Scanning 6977e191...")
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if tc.get("name") == "view_file" and "NnaCreatePage.tsx" in tc.get("args", {}).get("AbsolutePath", ""):
                        targs = tc["args"]
                        print(f"  Line {idx} | Start: {targs.get('StartLine')} | End: {targs.get('EndLine')}")
else:
    print("Transcript not found")
