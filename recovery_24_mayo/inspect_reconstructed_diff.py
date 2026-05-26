import difflib

file1 = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"
file2 = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

with open(file1, 'r', encoding='utf-8') as f:
    lines1 = f.read().splitlines()

with open(file2, 'r', encoding='utf-8') as f:
    lines2 = f.read().splitlines()

print(f"File 1 lines: {len(lines1)} | File 2 lines: {len(lines2)}")

# Let's find blocks of differences
diff = list(difflib.unified_diff(lines1, lines2, fromfile='reconstructed', tofile='reconstructed_6977', lineterm=''))
print(f"Total diff lines: {len(diff)}")

# Group diff by changes and print the first few hunk headers and changes
hunks = 0
for line in diff:
    if line.startswith('@@'):
        hunks += 1
        if hunks <= 15:
            print(line)
    elif line.startswith(('+', '-')) and hunks <= 15:
        # print up to 5 lines per hunk to not clutter
        print(line[:120])
