with open('E:\\Projeto_Unificado\\meu_site_atualizado\\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = content.count('{')
close_braces = content.count('}')

print(f'Open braces: {open_braces}')
print(f'Close braces: {close_braces}')
print(f'Difference: {open_braces - close_braces}')