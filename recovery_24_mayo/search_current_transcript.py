import os
import json

convs = ["ef06d065-2629-43ad-85aa-e97e4e1a41a5", "b8bb5bb7-90ea-457f-b2eb-33d3a34caf08"]

for conv in convs:
    transcript_path = rf"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\{conv}\.system_generated\logs\transcript_full.jsonl"
    if os.path.exists(transcript_path):
        print(f"Scanning {conv}...")
        with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f):
                try:
                    data = json.loads(line)
                    # Check tool calls
                    if "tool_calls" in data:
                        for tc in data["tool_calls"]:
                            targs = tc.get("args", {})
                            if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("AbsolutePath", ""):
                                print(f"  Line {idx} (MODEL tool call view_file) | Args: {targs}")
                            if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                                print(f"  Line {idx} (MODEL tool call modify/write) | Tool: {tc.get('name')} | Args keys: {list(targs.keys())}")
                    # Check tool results/outputs
                    if data.get("source") == "SYSTEM" and "content" in data:
                        content_str = str(data["content"])
                        if "NnaCreatePage" in content_str:
                            print(f"  Line {idx} (SYSTEM response) | Length: {len(content_str)} | Snippet: {content_str[:150]}")
                except Exception as e:
                    pass
    else:
        print(f"Transcript not found for {conv}")
