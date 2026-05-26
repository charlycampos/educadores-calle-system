import os
import json

a1b3_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(a1b3_path):
    print("Searching a1b3 transcript for NnaCreatePage.tsx writes/creation:")
    with open(a1b3_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        targs = tc.get("args", {})
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                            tname = tc.get("name")
                            print(f"  Line {idx+1} | Step {data.get('step_index')} | Tool: {tname} | Args keys: {list(targs.keys())}")
                            if tname == "write_to_file":
                                # Print code content size
                                code = targs.get("CodeContent")
                                if code:
                                    print(f"    FOUND complete write! CodeContent size: {len(code)} characters.")
            except Exception as e:
                pass
else:
    print("a1b3 transcript not found.")
