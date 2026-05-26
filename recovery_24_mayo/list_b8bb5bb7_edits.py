import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    print("Listing all modifications in session b8bb5bb7:")
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    targs = tc.get("args", {})
                    if isinstance(targs, dict) and "NnaCreatePage.tsx" in targs.get("TargetFile", ""):
                        tname = tc.get("name")
                        print(f"\n--- Line {idx} | Tool: {tname} | Instruction: {targs.get('Instruction')} ---")
                        if tname == "replace_file_content":
                            print(f"  StartLine: {targs.get('StartLine')} | EndLine: {targs.get('EndLine')}")
                            print(f"  TargetContent:\n{targs.get('TargetContent')}")
                            print(f"  ReplacementContent:\n{targs.get('ReplacementContent')}")
                        elif tname == "multi_replace_file_content":
                            chunks = targs.get("ReplacementChunks", [])
                            print(f"  Total chunks: {len(chunks)}")
                            for ci, chunk in enumerate(chunks):
                                print(f"    Chunk {ci} | StartLine: {chunk.get('StartLine')} | EndLine: {chunk.get('EndLine')}")
                                print(f"      TargetContent:\n{chunk.get('TargetContent')}")
                                print(f"      ReplacementContent:\n{chunk.get('ReplacementContent')}")
else:
    print("Transcript not found")
