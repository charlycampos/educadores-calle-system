import os

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5"

if os.path.exists(brain_dir):
    for root, dirs, files in os.walk(brain_dir):
        for file in files:
            full_path = os.path.join(root, file)
            print(f"Artifact/File: {full_path} | Size: {os.path.getsize(full_path)} bytes")
else:
    print("Brain directory not found")
