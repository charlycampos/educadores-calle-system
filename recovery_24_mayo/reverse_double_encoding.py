import os

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

# Read the corrupted file as UTF-8
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    corrupted_content = f.read()

try:
    # Encode as latin1 to get the raw original bytes
    raw_bytes = corrupted_content.encode('latin-1')
    
    # Decode as UTF-8 to interpret the raw bytes correctly
    restored_content = raw_bytes.decode('utf-8')
    
    print("Successfully reversed double encoding!")
    
    # Write it back to the file as UTF-8
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(restored_content)
    print("Successfully wrote restored UTF-8 file!")
except Exception as e:
    print("Error during reverse double encoding:", e)
