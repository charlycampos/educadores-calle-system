import os

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08"

if os.path.exists(brain_dir):
    for root, dirs, files in os.walk(brain_dir):
        for file in files:
            full_path = os.path.join(root, file)
            print(f"Artifact/File: {full_path} | Size: {os.path.getsize(full_path)} bytes")
else:
    print("Brain directory not found")
