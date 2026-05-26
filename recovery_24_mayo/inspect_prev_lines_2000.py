import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("source") == "MODEL" and data.get("type") == "VIEW_FILE":
                    targs = data.get("tool_calls", [{}])[0].get("args", {})
                    if "NnaCreatePage.tsx" in targs.get("AbsolutePath", ""):
                        start = targs.get("StartLine", 0)
                        end = targs.get("EndLine", 0)
                        if start >= 2000 and start <= 2100:
                            print(f"Line {idx} | Start: {start} | End: {end}")
                            print(f"Content:\n{data.get('content')[:1000]}")
                            break
            except Exception as e:
                pass
else:
    print("Transcript not found")
