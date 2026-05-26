import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    targs = tc.get("args", {})
                    if isinstance(targs, dict) and targs.get("StartLine") == 2261:
                        print(f"Found tool call at line {idx} | Step: {data.get('step_index')}")
            # Also search in the view responses
            if data.get("type") == "VIEW_FILE" and "content" in data:
                if "Showing lines 2261 to" in data["content"]:
                    print(f"Found system response at line {idx} | Content Len: {len(data['content'])}")
else:
    print("Transcript not found")
