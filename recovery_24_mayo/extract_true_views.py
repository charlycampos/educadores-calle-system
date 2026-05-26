import os
import json
import re

paths_to_transcripts = {
    "6977": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl",
    "a1b3": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"
}

def is_target_path(p):
    if not isinstance(p, str):
        return False
    p_norm = p.replace('\\', '/').lower()
    # It must be the client file, NOT scratch or Downloads or other folders
    return p_norm.endswith('/client/src/features/nna/nnacreatepage.tsx')

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

true_lines_6977 = {}
true_lines_a1b3 = {}

for name, tpath in paths_to_transcripts.items():
    if not os.path.exists(tpath):
        print(f"Transcript {name} not found at {tpath}")
        continue
        
    print(f"Parsing {name}...")
    lines_target = true_lines_6977 if name == "6977" else true_lines_a1b3
    
    steps = []
    with open(tpath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                steps.append(json.loads(line))
            except:
                pass
                
    for step_idx, step in enumerate(steps):
        if step.get("source") == "MODEL" and "tool_calls" in step:
            for tc in step["tool_calls"]:
                if tc.get("name") == "view_file":
                    targs = tc.get("args", {})
                    # Match target path
                    if isinstance(targs, dict) and is_target_path(targs.get("AbsolutePath")):
                        # Find the SYSTEM response
                        # In antigravity transcripts, the SYSTEM response is in the NEXT step or very close
                        for next_step in steps[step_idx:]:
                            if next_step.get("source") == "SYSTEM" and "content" in next_step:
                                content_str = next_step["content"]
                                lines_dict = parse_view_content(content_str)
                                if lines_dict:
                                    min_l = min(lines_dict.keys())
                                    max_l = max(lines_dict.keys())
                                    print(f"  Step {step.get('step_index')} | True view of {name} from {min_l} to {max_l} | Size: {len(lines_dict)}")
                                    lines_target.update(lines_dict)
                                    break

print(f"\nTrue unique lines in 6977: {len(true_lines_6977)}")
print(f"True unique lines in a1b3: {len(true_lines_a1b3)}")

# Save pure 6977
if true_lines_6977:
    out_pure = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pure_6977.tsx"
    with open(out_pure, 'w', encoding='utf-8') as out_f:
        max_line = max(true_lines_6977.keys())
        for i in range(1, max_line + 1):
            line_val = true_lines_6977.get(i, f"// MISSING LINE {i}")
            out_f.write(line_val + "\n")
    print(f"Saved pure 6977 views to {out_pure}")

# Save pure a1b3
if true_lines_a1b3:
    out_pure = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pure_a1b3.tsx"
    with open(out_pure, 'w', encoding='utf-8') as out_f:
        max_line = max(true_lines_a1b3.keys())
        for i in range(1, max_line + 1):
            line_val = true_lines_a1b3.get(i, f"// MISSING LINE {i}")
            out_f.write(line_val + "\n")
    print(f"Saved pure a1b3 views to {out_pure}")
