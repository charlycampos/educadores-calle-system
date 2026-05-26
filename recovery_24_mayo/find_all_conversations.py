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
                with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for idx, line in enumerate(f):
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
                                    print(f"Conv: {conv_id} | Line {idx} | Step {data.get('step_index')} | Tool: {tname} | Len: {content_len}")
            except Exception as e:
                print(f"Error in {conv_id}: {e}")
else:
    print("Brain directory not found")
