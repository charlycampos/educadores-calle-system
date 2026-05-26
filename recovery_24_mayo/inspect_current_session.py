import os
import json

conv = "ef06d065-2629-43ad-85aa-e97e4e1a41a5"
transcript_path = rf"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\{conv}\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    print(f"Scanning {conv} tool calls and writes:")
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        targs = tc.get("args", {})
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("AbsolutePath", ""):
                            print(f"  Line {idx} (MODEL view_file) | Range: {targs.get('StartLine')} to {targs.get('EndLine')}")
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                            print(f"  Line {idx} (MODEL modify/write) | Tool: {tc.get('name')} | Instruction: {targs.get('Instruction')}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
