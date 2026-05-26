file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "Loader2" in content:
    print("Loader2 is present in the reconstructed file!")
    # Print imports line
    for line in content.splitlines():
        if "Loader2" in line:
            print(f"Line: {line}")
else:
    print("Loader2 is NOT present in the reconstructed file.")
