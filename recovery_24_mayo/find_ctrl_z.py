file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"

with open(file_path, 'rb') as f:
    content = f.read()

ctrl_z_count = content.count(b'\x1a')
print(f"Total Ctrl+Z (\\x1a) bytes in file: {ctrl_z_count}")

if ctrl_z_count > 0:
    print("WARNING: Ctrl+Z bytes found! Cleaning them up...")
    cleaned_content = content.replace(b'\x1a', b'')
    with open(file_path, 'wb') as f:
        f.write(cleaned_content)
    print("SUCCESS! Stripped all Ctrl+Z bytes from reconstructed file.")
else:
    print("CLEAN! No Ctrl+Z bytes found in the reconstructed file.")
