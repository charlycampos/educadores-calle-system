import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 125:
                data = json.loads(line)
                content = data.get("content", "")
                lines = content.splitlines()
                print("Lines around 2300-2345 in Line 125 content:")
                for l in lines:
                    import re
                    match = re.match(r"^(\d+):\s(.*)$", l)
                    if match:
                        num = int(match.group(1))
                        if num >= 2300 and num <= 2345:
                            print(l)
                break
else:
    print("Transcript not found")
