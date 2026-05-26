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

# 1. Load 6977 views that occurred before Line 143 in the transcript (before any edits were made!)
lines_6977_pristine = {}
if os.path.exists(paths_to_transcripts["6977"]):
    with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            # Only use views before step 143 (which corresponds to line 143 in transcript)
            if idx + 1 < 143:
                try:
                    data = json.loads(line)
                    if data.get("type") == "VIEW_FILE" and "content" in data:
                        content_str = data["content"]
                        if is_target_content(content_str):
                            lines_dict = parse_view_content(content_str)
                            lines_6977_pristine.update(lines_dict)
                            min_l = min(lines_dict.keys())
                            max_l = max(lines_dict.keys())
                            print(f"  Line {idx+1} | Loaded pristine view of 6977 from {min_l} to {max_l} | Size: {len(lines_dict)}")
                except:
                    pass

print(f"Loaded {len(lines_6977_pristine)} pristine lines from 6977.")

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
    for idx, step in enumerate(reversed(steps_a1b3)):
        step_line_num = len(steps_a1b3) - idx
        if step.get("type") == "VIEW_FILE" and "content" in step:
            content_str = step["content"]
            if is_target_content(content_str):
                lines_dict = parse_view_content(content_str)
                # Fill lines that we don't have yet in lines_a1b3_latest
                added_count = 0
                for k, v in lines_dict.items():
                    if k not in lines_a1b3_latest:
                        lines_a1b3_latest[k] = v
                        added_count += 1
                if added_count > 0:
                    min_l = min(lines_dict.keys())
                    max_l = max(lines_dict.keys())
                    print(f"  Line {step_line_num} | Loaded {added_count} lines from a1b3 latest-first ({min_l} to {max_l})")

print(f"Loaded {len(lines_a1b3_latest)} lines from a1b3.")

# 3. Combine them
final_reconstruction = {}
max_line_6977 = 4269 # Known baseline length

for i in range(1, max_line_6977 + 1):
    if i in lines_6977_pristine:
        final_reconstruction[i] = lines_6977_pristine[i]
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
    print("SUCCESS! Perfectly stitched and aligned a 100% complete pristine file with 0 gaps!")
    
    # Save the perfect baseline file
    out_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pristine_baseline.tsx"
    with open(out_file, 'w', encoding='utf-8') as f:
        for i in range(1, max_line_6977 + 1):
            f.write(final_reconstruction[i] + "\n")
    print(f"Saved pristine baseline to: {out_file}")
