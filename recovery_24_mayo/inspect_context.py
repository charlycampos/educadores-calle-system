import os
import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx > 5:
                break
            data = json.loads(line)
            print(f"Line {idx} | Source: {data.get('source')} | Type: {data.get('type')}")
            content_str = str(data.get("content", ""))
            print(f"  Content Len: {len(content_str)}")
            if "NnaCreatePage.tsx" in content_str:
                print("  Found NnaCreatePage.tsx in this content!")
                # Let's print occurrences
                pos = 0
                while True:
                    pos = content_str.find("NnaCreatePage.tsx", pos)
                    if pos == -1:
                        break
                    print(f"    Occurrence at index {pos}: {content_str[pos:pos+200]}")
                    pos += 1
else:
    print("Transcript not found")
