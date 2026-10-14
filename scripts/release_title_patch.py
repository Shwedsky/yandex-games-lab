from pathlib import Path

p = Path('apps/mutants-merge/src/game.ts')
s = p.read_text()
s = s.replace("title: 'МУТАНТЫ'", "title: 'Мутанты: Геномный синтез'")
s = s.replace("title: 'MUTANTS'", "title: 'Mutants: Genome Merge'")
s = s.replace("fontFamily: 'Arial Black, Arial', fontSize: '39px', color: '#ffffff'", "fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'", 1)
p.write_text(s)
