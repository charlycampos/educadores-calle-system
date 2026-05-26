import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"
dest_file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

latest_code = None
latest_step = None

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("source") == "MODEL" and "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        if tc.get("name") == "write_to_file" and "NnaCreatePage.tsx" in tc.get("args", {}).get("TargetFile", ""):
                            code_content = tc.get("args", {}).get("CodeContent")
                            if code_content:
                                latest_code = code_content
                                latest_step = (idx, data.get("step_index"))
            except Exception as e:
                pass

if latest_code:
    print(f"Found latest complete file in step {latest_step[1]} at line {latest_step[0]}!")
    print(f"Size of recovered code: {len(latest_code)} characters.")
    
    # Let's write the recovered code to the destination file in UTF-8
    with open(dest_file_path, 'w', encoding='utf-8') as f:
        f.write(latest_code)
    print("Successfully restored the exact original file from previous session backup!")
else:
    print("Failed to find any complete file backup in past transcripts.")
