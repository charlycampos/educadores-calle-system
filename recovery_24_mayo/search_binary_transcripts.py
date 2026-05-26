import os

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"
search_bytes = b"Actualizar Expediente"

if os.path.exists(brain_dir):
    print("Searching past transcripts in BINARY mode...")
    for root, dirs, files in os.walk(brain_dir):
        for file in files:
            if file.endswith(".jsonl") or file.endswith(".json"):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'rb') as f:
                        content = f.read()
                        if search_bytes in content:
                            print(f"Found in binary: {full_path} | Size: {len(content)} bytes")
                            # Let's count how many times it occurs
                            count = content.count(search_bytes)
                            print(f"  Occurrences: {count}")
                except Exception as e:
                    pass
else:
    print("Brain directory not found")
