import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"
output_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\output.txt"

line_indices = [242, 246, 277, 278, 279, 280, 281]

with open(output_path, 'w', encoding='utf-8') as out:
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx in line_indices:
                out.write(f"--- Line {idx} ---\n")
                try:
                    data = json.loads(line)
                    content = data.get("content", "")
                    if not content and "tool_calls" in data:
                        content = str(data["tool_calls"])
                    out.write(content + "\n")
                except Exception as e:
                    out.write(f"Error loading json: {e}\n")
                    out.write(line + "\n")

print("Successfully wrote output.txt in UTF-8!")
