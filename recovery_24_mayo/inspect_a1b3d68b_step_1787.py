import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 1771:
                data = json.loads(line)
                print(f"Line 1771 | Step: {data.get('step_index')}")
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        targs = tc.get("args", {})
                        print(f"Tool name: {tc.get('name')}")
                        print(f"StartLine: {targs.get('StartLine')} | EndLine: {targs.get('EndLine')}")
                        print(f"TargetContent len: {len(targs.get('TargetContent', ''))}")
                        print(f"ReplacementContent len: {len(targs.get('ReplacementContent', ''))}")
                        print(f"Instruction: {targs.get('Instruction')}")
                        # Let's see the beginning and end of TargetContent/ReplacementContent
                        rcontent = targs.get("ReplacementContent", "")
                        print(f"ReplacementContent Start:\n{rcontent[:300]}")
                        print(f"ReplacementContent End:\n{rcontent[-300:]}")
else:
    print("Transcript not found")
