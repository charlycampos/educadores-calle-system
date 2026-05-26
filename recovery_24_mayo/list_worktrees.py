import os

worktrees_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\worktrees"

if os.path.exists(worktrees_dir):
    for root, dirs, files in os.walk(worktrees_dir):
        for file in files:
            if "NnaCreatePage" in file:
                full_path = os.path.join(root, file)
                print(f"Found in worktrees: {full_path} | Size: {os.path.getsize(full_path)} bytes")
else:
    print("Worktrees directory not found")
