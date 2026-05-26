import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"

if os.path.exists(brain_dir):
    matches = []
    for conv_id in os.listdir(brain_dir):
        conv_path = os.path.join(brain_dir, conv_id)
        if not os.path.isdir(conv_path):
            continue
        transcript_path = os.path.join(conv_path, ".system_generated", "logs", "transcript_full.jsonl")
        if os.path.exists(transcript_path):
            try:
                # We also want the file creation time of the transcript to sort them
                mtime = os.path.getmtime(transcript_path)
                with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for idx, line in enumerate(f):
                        if "NnaCreatePage.tsx" in line:
                            data = json.loads(line)
                            matches.append({
                                "conv_id": conv_id,
                                "mtime": mtime,
                                "line_idx": idx,
                                "step_index": data.get("step_index"),
                                "source": data.get("source"),
                                "type": data.get("type"),
                                "tool_calls": data.get("tool_calls"),
                                "content": data.get("content")
                            })
                            break # Just find the first occurrence in each conversation
            except Exception as e:
                pass
    
    # Sort matches by transcript modification time
    matches.sort(key=lambda x: x["mtime"])
    for m in matches:
        print(f"Conv: {m['conv_id']} | First occurrence line {m['line_idx']} | Type: {m['type']} | Source: {m['source']}")
        if m["tool_calls"]:
            for tc in m["tool_calls"]:
                print(f"  Tool: {tc.get('name')} | Args: {tc.get('args')}")
else:
    print("Brain directory not found")
