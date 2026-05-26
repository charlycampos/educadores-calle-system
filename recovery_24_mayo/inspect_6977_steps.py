import os
import json

tpath = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(tpath):
    print("Scanning 6977 for modifications:")
    with open(tpath, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        targs = tc.get("args", {})
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                            tname = tc.get("name")
                            print(f"  Line {idx+1} | Step {data.get('step_index')} | Tool: {tname} | Instruction: {targs.get('Instruction')}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
