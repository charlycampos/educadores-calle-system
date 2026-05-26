file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'type="hidden"' in content:
    print("Found hidden input in reconstructed file!")
    # Print the lines around it
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        if 'type="hidden"' in line:
            print(f"Line {idx+1}: {line}")
else:
    print("Hidden input NOT found in reconstructed file.")
