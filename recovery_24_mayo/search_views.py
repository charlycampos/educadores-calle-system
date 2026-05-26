import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

views = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if tc.get("name") == "view_file":
                        args = tc.get("args", {})
                        path = args.get("AbsolutePath", "")
                        if "NnaCreatePage.tsx" in path:
                            views.append({
                                "step_index": data.get("step_index"),
                                "start_line": args.get("StartLine"),
                                "end_line": args.get("EndLine"),
                            })
        except Exception as e:
            pass

print(f"Found {len(views)} view_file calls for NnaCreatePage.tsx:")
for v in views:
    print(f"Step {v['step_index']}: lines {v['start_line']} to {v['end_line']}")
