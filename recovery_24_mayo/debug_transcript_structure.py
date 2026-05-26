import os
import json

tpath = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(tpath):
    print("Reading first few lines of transcript...")
    count = 0
    with open(tpath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                count += 1
                if count <= 5:
                    print(f"\n--- Line {count} | Source: {data.get('source')} | Type: {data.get('type')} ---")
                    # print keys
                    print(f"  Keys: {list(data.keys())}")
                    if "tool_calls" in data:
                        print(f"  Tool calls: {data['tool_calls']}")
                
                # Let's search for any tool call with 'view_file'
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        if tc.get("name") == "view_file":
                            print(f"\nFound view_file at line {count}:")
                            print(f"  Args: {tc.get('args')}")
                            # find next line with the result
                            break
            except Exception as e:
                pass
            if count >= 100:
                break
else:
    print("Transcript not found.")
