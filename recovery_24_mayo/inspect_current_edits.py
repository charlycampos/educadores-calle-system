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
                        targs = tc.get("args", {})
                        if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                            print(f"Line {idx} | Tool: {tc.get('name')}")
                            for k, v in targs.items():
                                if k in ["StartLine", "EndLine", "TargetContent", "ReplacementContent", "ReplacementChunks"]:
                                    val_str = str(v)
                                    if len(val_str) > 200:
                                        val_str = val_str[:200] + "... (truncated)"
                                    print(f"  {k}: {val_str}")
            except Exception as e:
                pass
else:
    print("Transcript not found")
