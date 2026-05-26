import os

search_paths = [
    r"D:\Usuarios\ccampos\Documents",
    r"D:\Usuarios\ccampos\Desktop",
    r"D:\Usuarios\ccampos\Downloads"
]

print("Searching major user folders for NnaCreatePage.tsx copies...")
count = 0
for base in search_paths:
    if os.path.exists(base):
        print(f"Checking path: {base}")
        for root, dirs, files in os.walk(base):
            # Skip massive dependency folders
            if any(p in root.lower() for p in ["node_modules", ".git", "venv", "__pycache__"]):
                continue
            for file in files:
                if "NnaCreatePage" in file:
                    full_path = os.path.join(root, file)
                    size = os.path.getsize(full_path)
                    print(f"Found: {full_path} | Size: {size} bytes")
                    count += 1
print(f"Search completed. Found {count} files.")
