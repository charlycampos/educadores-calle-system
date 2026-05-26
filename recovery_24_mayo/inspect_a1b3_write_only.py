import os
import json

a1b3_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(a1b3_path):
    print("Searching a1b3 transcript ONLY for write_to_file:")
    with open(a1b3_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        targs = tc.get("args", {})
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                            tname = tc.get("name")
                            if tname == "write_to_file":
                                code = targs.get("CodeContent")
                                print(f"  Line {idx+1} | Step {data.get('step_index')} | CodeContent size: {len(code) if code else 0} chars")
                                # Let's write the complete code content to a temporary backup file!
                                out_backup = rf"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_a1b3_write_{data.get('step_index')}.tsx"
                                if code:
                                    with open(out_backup, 'w', encoding='utf-8') as out_f:
                                        out_f.write(code)
                                    print(f"    SUCCESS! Saved complete backup file to {out_backup}")
            except Exception as e:
                pass
else:
    print("a1b3 transcript not found.")
