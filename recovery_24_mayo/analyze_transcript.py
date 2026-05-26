import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("source") == "MODEL" and "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        tname = tc.get("name")
                        targs = tc.get("args", {})
                        tfile = targs.get("TargetFile", "") if isinstance(targs, dict) else ""
                        if "NnaCreatePage.tsx" in tfile:
                            content_len = 0
                            if "CodeContent" in targs:
                                content_len = len(targs["CodeContent"])
                            elif "ReplacementContent" in targs:
                                content_len = len(targs["ReplacementContent"])
                            print(f"Line {idx} | Step {data.get('step_index')} | Tool: {tname} | Target: {tfile} | Content Len: {content_len}")
            except Exception as e:
                print(f"Error parsing line {idx}: {e}")
else:
    print("Transcript not found at", transcript_path)
