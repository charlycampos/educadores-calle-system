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
                        if "tool_calls" in data:
                            for tc in data["tool_calls"]:
                                targs = tc.get("args", {})
                                if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                                    content = targs.get("CodeContent") or targs.get("ReplacementContent") or ""
                                    if len(content) > 20000:
                                        print(f"Conv: {conv_id} | Line {idx} | Step {data.get('step_index')} | Tool: {tc.get('name')} | Content Length: {len(content)}")
            except Exception as e:
                pass
else:
    print("Brain directory not found")
