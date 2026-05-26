import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

original_targets = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Look for step with MODEL source and tool_calls
            if data.get("source") == "MODEL" and "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if tc.get("name") == "replace_file_content":
                        args = tc.get("args", {})
                        target_content = args.get("TargetContent")
                        replacement_content = args.get("ReplacementContent")
                        start_line = args.get("StartLine")
                        end_line = args.get("EndLine")
                        
                        original_targets.append({
                            "step_index": data.get("step_index"),
                            "start_line": start_line,
                            "end_line": end_line,
                            "TargetContent": target_content,
                            "ReplacementContent": replacement_content
                        })
        except Exception as e:
            pass

print(f"Found {len(original_targets)} replacements:")
for ot in original_targets:
    print(f"Step {ot['step_index']} (lines {ot['start_line']}-{ot['end_line']}):")
    # Show first 100 chars of target
    print("TARGET:", ot["TargetContent"][:150] if ot["TargetContent"] else "None")
    print("---")
