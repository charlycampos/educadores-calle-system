file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's replace the specific target block:
#                 })(),
#             } as any);
#         }
#     }, [isEditMode, selectedExpediente, reset]);

old_segment = """                })(),
            } as any);
        }
    }, [isEditMode, selectedExpediente, reset]);"""

new_segment = """                })(),
            } as any));
        }
    }, [isEditMode, selectedExpediente, reset]);"""

if old_segment in content:
    content = content.replace(old_segment, new_segment)
    print("Successfully replaced and added missing parenthesis!")
else:
    # Try finding it with different line ending
    old_segment_lf = old_segment.replace('\r\n', '\n')
    new_segment_lf = new_segment.replace('\r\n', '\n')
    if old_segment_lf in content:
        content = content.replace(old_segment_lf, new_segment_lf)
        print("Successfully replaced and added missing parenthesis (LF)!")
    else:
        print("Could not find the target segment!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
