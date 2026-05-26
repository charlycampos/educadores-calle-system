import os
import json
import re

paths_to_transcripts = {
    "6977": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl",
    "a1b3": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"
}

def is_target_content(content):
    if not content:
        return False
    lines = content.splitlines()
    for line in lines[:8]:
        if "File Path:" in line and "client/src/features/nna/NnaCreatePage.tsx" in line.replace("%20", " ").replace("\\", "/"):
            return True
    return False

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

# 1. Load all 6977 views (latest always wins, though usually they are consistent)
lines_6977 = {}
if os.path.exists(paths_to_transcripts["6977"]):
    with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE" and "content" in data:
                    content_str = data["content"]
                    if is_target_content(content_str):
                        lines_dict = parse_view_content(content_str)
                        lines_6977.update(lines_dict)
            except:
                pass

print(f"Loaded {len(lines_6977)} lines from 6977.")

# 2. Parse a1b3 backwards to find the latest unshifted views for the gaps
lines_a1b3_latest = {}
if os.path.exists(paths_to_transcripts["a1b3"]):
    steps_a1b3 = []
    with open(paths_to_transcripts["a1b3"], 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                steps_a1b3.append(json.loads(line))
            except:
                pass
                
    # Iterate backwards
    for step in reversed(steps_a1b3):
        if step.get("type") == "VIEW_FILE" and "content" in step:
            content_str = step["content"]
            if is_target_content(content_str):
                lines_dict = parse_view_content(content_str)
                # Fill lines that we don't have yet (to grab the latest version of each line!)
                for k, v in lines_dict.items():
                    if k not in lines_a1b3_latest:
                        lines_a1b3_latest[k] = v

print(f"Loaded {len(lines_a1b3_latest)} lines from a1b3 (latest-first).")

# 3. Combine them: start with 6977, and fill gaps using a1b3_latest
final_reconstruction = {}
max_line_6977 = max(lines_6977.keys()) if lines_6977 else 4269

for i in range(1, max_line_6977 + 1):
    if i in lines_6977:
        final_reconstruction[i] = lines_6977[i]
    elif i in lines_a1b3_latest:
        final_reconstruction[i] = lines_a1b3_latest[i]
    else:
        print(f"WARNING: Line {i} remains missing in both sessions!")

# Verify gaps
missing = []
for i in range(1, max_line_6977 + 1):
    if i not in final_reconstruction:
        missing.append(i)

if missing:
    print(f"CRITICAL: {len(missing)} missing lines remain: {missing[:30]}...")
else:
    print("SUCCESS! Perfectly stitched and aligned a 100% complete file with 0 gaps!")
    
    # Save the perfect baseline file
    out_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_perfect_baseline.tsx"
    with open(out_file, 'w', encoding='utf-8') as f:
        for i in range(1, max_line_6977 + 1):
            f.write(final_reconstruction[i] + "\n")
    print(f"Saved perfect baseline to: {out_file}")
