import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"

if os.path.exists(brain_dir):
    for conv_id in os.listdir(brain_dir):
        conv_path = os.path.join(brain_dir, conv_id)
        if not os.path.isdir(conv_path):
            continue
        transcript_path = os.path.join(conv_path, ".system_generated", "logs", "transcript_full.jsonl")
        if os.path.exists(transcript_path):
            try:
                ranges = []
                with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for idx, line in enumerate(f):
                        data = json.loads(line)
                        if "tool_calls" in data:
                            for tc in data["tool_calls"]:
                                if tc.get("name") == "view_file" and "NnaCreatePage.tsx" in tc.get("args", {}).get("AbsolutePath", ""):
                                    targs = tc["args"]
                                    ranges.append((targs.get("StartLine"), targs.get("EndLine"), idx))
                if ranges:
                    print(f"Conv: {conv_id} | Total views: {len(ranges)}")
                    for r in sorted(ranges, key=lambda x: x[0] or 0):
                        print(f"  Start: {r[0]} | End: {r[1]} | Transcript Line: {r[2]}")
            except Exception as e:
                pass
else:
    print("Brain directory not found")
