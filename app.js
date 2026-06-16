const el = (id) => document.getElementById(id);
const NOTA_MAXIMA = 7;

function formatNota(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

const state = {
  iniciado: false,
  nome: '', email: '', turma: '',
  semente: null,
  inicio: null,
  cwd: '/home/aluno',
  history: [],
  fs: {},
  validacoes: []
};

function resetFs() {
  state.cwd = '/home/aluno';
  state.fs = {
    '/': { type: 'dir', mode: '755', children: ['home'] },
    '/home': { type: 'dir', mode: '755', children: ['aluno'] },
    '/home/aluno': { type: 'dir', mode: '755', children: [] }
  };
}

function gerarCodigoOculto(email) {
  // Código de verificação da tentativa. Não aparece nos desafios.
  // Serve para identificar duplicidade de entrega e associar a tentativa ao TXT exportado.
  const txt = (email || '') + '|' + new Date().toISOString() + '|' + Math.random();
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return 1000 + (h % 9000);
}

function baseName(path) {
  if (path === '/') return '/';
  const p = path.split('/').filter(Boolean);
  return p[p.length - 1] || '/';
}

function parentPath(path) {
  const p = normalize(path).split('/').filter(Boolean);
  p.pop();
  return '/' + p.join('/');
}

function normalize(path) {
  const parts = [];
  const raw = path.startsWith('/') ? path.split('/') : (state.cwd + '/' + path).split('/');
  for (const part of raw) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop(); else parts.push(part);
  }
  return '/' + parts.join('/');
}

function addChild(dir, child) {
  if (!state.fs[dir] || state.fs[dir].type !== 'dir') return;
  if (!state.fs[dir].children.includes(child)) state.fs[dir].children.push(child);
}

function mkdir(path) {
  const full = normalize(path);
  if (state.fs[full]) return `mkdir: cannot create directory '${path}': File exists`;
  const parent = parentPath(full);
  if (!state.fs[parent] || state.fs[parent].type !== 'dir') return `mkdir: cannot create directory '${path}': No such file or directory`;
  state.fs[full] = { type: 'dir', mode: '755', children: [] };
  addChild(parent, baseName(full));
  return '';
}

function writeFile(path, content) {
  const full = normalize(path);
  const parent = parentPath(full);
  if (!state.fs[parent] || state.fs[parent].type !== 'dir') return `bash: ${path}: No such file or directory`;
  if (!state.fs[full]) addChild(parent, baseName(full));
  state.fs[full] = { type: 'file', mode: state.fs[full]?.mode || '644', content, mtime: new Date().toISOString() };
  return '';
}

function copyFile(src, dest) {
  const a = normalize(src), b = normalize(dest);
  if (!state.fs[a] || state.fs[a].type !== 'file') return `cp: cannot stat '${src}': No such file or directory`;
  const parent = parentPath(b);
  if (!state.fs[parent] || state.fs[parent].type !== 'dir') return `cp: cannot create regular file '${dest}': No such file or directory`;
  if (!state.fs[b]) addChild(parent, baseName(b));
  state.fs[b] = { type: 'file', mode: state.fs[a].mode, content: state.fs[a].content, mtime: new Date().toISOString() };
  return '';
}

function modeToLetters(mode, type) {
  const m = (mode || '000').padStart(3, '0').slice(-3).split('').map(Number);
  const chars = m.map(n => `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`).join('');
  return (type === 'dir' ? 'd' : '-') + chars;
}

function listDir(path, long=false, all=false, dirOnly=false) {
  const full = normalize(path || '.');
  const node = state.fs[full];
  if (!node) return `ls: cannot access '${path}': No such file or directory`;
  if (node.type === 'file' || dirOnly) {
    return long ? `${modeToLetters(node.mode, node.type)} 1 aluno aluno ${node.type === 'file' ? (node.content || '').length : 4096} ${baseName(full)}` : baseName(full);
  }
  const names = [...node.children].sort();
  const finalNames = all ? ['.', '..', ...names] : names;
  if (!long) return finalNames.join('  ');
  return finalNames.map(name => {
    if (name === '.') return `${modeToLetters(node.mode, 'dir')} 1 aluno aluno 4096 .`;
    if (name === '..') return `${modeToLetters(state.fs[parentPath(full)]?.mode || '755', 'dir')} 1 aluno aluno 4096 ..`;
    const childPath = normalize(full + '/' + name);
    const child = state.fs[childPath];
    const size = child.type === 'file' ? (child.content || '').length : 4096;
    return `${modeToLetters(child.mode, child.type)} 1 aluno aluno ${String(size).padStart(4)} ${name}`;
  }).join('\n');
}

function parseEchoRedirection(cmd) {
  // Suporta: echo texto > arquivo | echo "texto" > arquivo | echo 'texto' > arquivo
  const m = cmd.match(/^echo\s+(.+?)\s*>\s*(\S+)\s*$/);
  if (!m) return null;
  let content = m[1].trim();
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1);
  }
  return { content, file: m[2] };
}

function parseEcho(cmd) {
  const m = cmd.match(/^echo\s+(.+)$/);
  if (!m) return null;
  let content = m[1].trim();
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1);
  }
  return content;
}

function runScript(path) {
  const full = normalize(path.replace(/^\.\//, ''));
  const node = state.fs[full];
  if (!node || node.type !== 'file') return `bash: ${path}: No such file or directory`;
  const ownerCanExecute = Number(node.mode[0]) & 1;
  if (!ownerCanExecute) return `bash: ${path}: Permission denied`;
  const line = (node.content || '').trim();
  const echoed = parseEcho(line);
  if (echoed !== null) return echoed;
  return '';
}

function statFile(path) {
  const full = normalize(path);
  const node = state.fs[full];
  if (!node) return `stat: cannot statx '${path}': No such file or directory`;
  const size = node.type === 'file' ? (node.content || '').length : 4096;
  return `  File: ${baseName(full)}\n  Size: ${size}\tType: ${node.type === 'dir' ? 'directory' : 'regular file'}\nAccess: (${node.mode}/${modeToLetters(node.mode, node.type)})  Uid: ( 1000/ aluno)   Gid: ( 1000/ aluno)`;
}

function execute(raw) {
  const cmd = raw.trim();
  if (!cmd) return '';

  const redir = parseEchoRedirection(cmd);
  if (redir) return writeFile(redir.file, redir.content);

  const parts = cmd.split(/\s+/);
  const c = parts[0];
  const args = parts.slice(1);

  if (c === 'help') return `Comandos disponíveis e dicas rápidas:

pwd                         mostra a pasta/diretório atual onde você está
ls                          lista arquivos e diretórios do local atual
ls -l NOME                  lista um arquivo/diretório com detalhes e permissões
ls -la                      lista tudo com detalhes, inclusive itens ocultos
mkdir NOME                  cria um diretório; nesta avaliação, crie um por comando
cd NOME                     entra em um diretório
cd ..                       volta para o diretório anterior
echo "texto" > arquivo    cria ou substitui um arquivo com o texto informado
cat arquivo                 mostra o conteúdo de um arquivo
cp origem destino           copia um arquivo
chmod NNN arquivo           muda permissões usando três números: dono, grupo e outros
stat arquivo                mostra metadados do arquivo
df -h                       mostra o uso de espaço do sistema de arquivos
./arquivo.sh                executa um script, se ele tiver permissão de execução
clear                       limpa a tela
help                        mostra esta ajuda

Dicas de uso:
- Para criar arquivo de texto: echo "meu texto" > nome.txt
- Para criar script simples: echo 'echo "mensagem"' > nome.sh
- Para mostrar conteúdo: cat nome.txt
- Para ver permissões: ls -l nome.txt
- Para executar script: ./nome.sh

Legenda das permissões:
r = leitura, w = escrita, x = execução
4 = r, 2 = w, 1 = x
7 = rwx, 6 = rw-, 5 = r-x, 4 = r--, 0 = ---
Exemplos:
chmod 764 arquivo.txt => dono rwx, grupo rw-, outros r--
chmod 755 script.sh   => dono rwx, grupo r-x, outros r-x
chmod 600 privado.txt => dono rw-, grupo ---, outros ---
chmod 777 arquivo.txt => dono rwx, grupo rwx, outros rwx`;
  if (c === 'clear') { el('terminal').textContent = ''; return ''; }
  if (c === 'pwd') return state.cwd;
  if (c === 'cd') {
    const target = normalize(args[0] || '/home/aluno');
    if (!state.fs[target] || state.fs[target].type !== 'dir') return `bash: cd: ${args[0] || ''}: No such file or directory`;
    state.cwd = target;
    return '';
  }
  if (c === 'mkdir') {
    if (args.length === 0) return 'mkdir: missing operand';
    return args.map(mkdir).filter(Boolean).join('\n');
  }
  if (c === 'touch') {
    if (args.length === 0) return 'touch: missing file operand';
    return args.map(a => writeFile(a, state.fs[normalize(a)]?.content || '')).filter(Boolean).join('\n');
  }
  if (c === 'cat') {
    if (args.length === 0) return 'cat: missing file operand';
    const full = normalize(args[0]);
    const node = state.fs[full];
    if (!node || node.type !== 'file') return `cat: ${args[0]}: No such file or directory`;
    return node.content || '';
  }
  if (c === 'cp') {
    if (args.length < 2) return 'cp: missing file operand';
    return copyFile(args[0], args[1]);
  }
  if (c === 'chmod') {
    if (args.length < 2) return 'chmod: missing operand';
    const mode = args[0];
    if (!/^\d{3}$/.test(mode)) return `chmod: invalid mode: '${mode}'`;
    const full = normalize(args[1]);
    if (!state.fs[full]) return `chmod: cannot access '${args[1]}': No such file or directory`;
    state.fs[full].mode = mode;
    return '';
  }
  if (c === 'ls') {
    let long = false, all = false, dirOnly = false;
    const paths = [];
    for (const a of args) {
      if (a.startsWith('-')) { long = long || a.includes('l'); all = all || a.includes('a'); dirOnly = dirOnly || a.includes('d'); }
      else paths.push(a);
    }
    return listDir(paths[0] || '.', long, all, dirOnly);
  }
  if (c === 'stat') {
    if (args.length === 0) return 'stat: missing operand';
    return statFile(args[0]);
  }
  if (c === 'df') {
    return `Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1       2.0G  128M  1.9G   7% /\ntmpfs           256M     0  256M   0% /tmp`;
  }
  if (cmd.startsWith('./')) return runScript(cmd);
  if (c === 'echo') return parseEcho(cmd) ?? '';
  return `${c}: command not found`;
}

function print(text) {
  const terminal = el('terminal');
  terminal.textContent += text + (text.endsWith('\n') ? '' : '\n');
  terminal.scrollTop = terminal.scrollHeight;
}

function promptStr() {
  return `aluno@linux:${state.cwd}$`;
}

function updatePrompt() {
  el('prompt').textContent = promptStr();
}

function record(cmd, out) {
  state.history.push({ t: new Date().toISOString(), cwd: state.cwd, cmd, saida: out });
}

function expected() {
  return {
    base: `/home/aluno/avaliacao`,
    validacao: `/home/aluno/avaliacao/validacao.txt`,
    script: `/home/aluno/avaliacao/show.sh`,
    privado: `/home/aluno/avaliacao/privado.txt`
  };
}

function hasCmd(pattern) {
  return state.history.some(h => pattern.test(h.cmd));
}

function validate() {
  if (!state.iniciado) return;
  const e = expected();

  const cmdExact = (text) => state.history.some(h => h.cmd === text);
  const cmdRe = (pattern) => state.history.some(h => pattern.test(h.cmd));
  const inBase = (path) => state.fs[`${e.base}/${path}`];

  const checks = [
    ['Q1 - Mostrou o diretório atual com pwd', cmdExact('pwd')],
    [`Q2 - Criou a pasta avaliacao com mkdir`, cmdExact(`mkdir avaliacao`) && !!state.fs[e.base] && state.fs[e.base].type === 'dir'],
    [`Q3 - Entrou na pasta avaliacao com cd`, cmdExact(`cd avaliacao`) && state.history.some(h => h.cmd === `cd avaliacao`)],
    ['Q4 - Criou o diretório textos com mkdir', cmdExact('mkdir textos') && inBase('textos')?.type === 'dir'],
    ['Q5 - Criou o diretório scripts com mkdir', cmdExact('mkdir scripts') && inBase('scripts')?.type === 'dir'],
    ['Q6 - Criou o diretório temporarios com mkdir', cmdExact('mkdir temporarios') && inBase('temporarios')?.type === 'dir'],
    ['Q7 - Listou o diretório atual com ls -la', cmdExact('ls -la')],
    [`Q8 - Criou validacao.txt com echo e redirecionamento >`, cmdRe(/^echo\s+["']?[Ll]inux["']?\s*>\s*validacao\.txt$/) && /^linux$/i.test(state.fs[e.validacao]?.content || '')],
    [`Q9 - Mostrou validacao.txt com cat`, cmdExact(`cat validacao.txt`)],
    [`Q10 - Alterou as permissões de validacao.txt com chmod`, cmdExact(`chmod 764 validacao.txt`) && state.fs[e.validacao]?.mode === '764'],
    [`Q11 - Exibiu permissões de validacao.txt com ls -l`, cmdExact(`ls -l validacao.txt`)],
    [`Q12 - Criou show.sh com echo e redirecionamento >`, cmdRe(/^echo\s+['"]echo \"Alo mundo\"['"]\s*>\s*show\.sh$/) && (state.fs[e.script]?.content || '').includes(`echo "Alo mundo"`)],
    [`Q13 - Mostrou show.sh com cat`, cmdExact(`cat show.sh`)],
    [`Q14 - Exibiu permissões iniciais de show.sh com ls -l`, cmdExact(`ls -l show.sh`)],
    [`Q15 - Alterou as permissões de show.sh com chmod`, cmdExact(`chmod 755 show.sh`) && state.fs[e.script]?.mode === '755'],
    [`Q16 - Exibiu novas permissões de show.sh com ls -l`, state.history.filter(h => h.cmd === `ls -l show.sh`).length >= 2],
    [`Q17 - Executou show.sh com ./show.sh`, cmdExact(`./show.sh`) && state.history.some(h => h.cmd === `./show.sh` && h.saida === `Alo mundo`)],
    [`Q18 - Criou privado.txt com echo e redirecionamento >`, cmdRe(/^echo\s+.+\s*>\s*privado\.txt$/) && !!state.fs[e.privado] && state.fs[e.privado].type === 'file'],
    [`Q19 - Alterou as permissões de privado.txt com chmod`, cmdExact(`chmod 600 privado.txt`) && state.history.some(h => h.cmd === `chmod 600 privado.txt`)],
    [`Q20 - Listou privado.txt após alterar permissões com ls -l`, state.history.some((h, idx) => h.cmd === `ls -l privado.txt` && state.history.slice(0, idx).some(x => x.cmd === `chmod 600 privado.txt`))],
    [`Q21 - Alterou novamente as permissões de privado.txt com chmod`, cmdExact(`chmod 777 privado.txt`) && state.fs[e.privado]?.mode === '777'],
    [`Q22 - Listou privado.txt após nova alteração de permissões com ls -l`, state.history.some((h, idx) => h.cmd === `ls -l privado.txt` && state.history.slice(0, idx).some(x => x.cmd === `chmod 777 privado.txt`))]
  ];
  state.validacoes = checks;
  const total = checks.length;
  const ok = checks.filter(c => c[1]).length;
  el('validacao').innerHTML = checks.map(([label, passed], i) => `
    <div class="check"><span class="${passed ? 'ok' : 'no'}">${passed ? '✓' : '✗'}</span><span>${label}</span><strong>${passed ? 'ok' : 'pendente'}</strong></div>
  `).join('') + `<p><strong>Parcial:</strong> ${ok}/${total} itens. <strong>Nota:</strong> ${formatNota(total ? (ok / total) * NOTA_MAXIMA : 0)} / ${formatNota(NOTA_MAXIMA)}</p>`;
}

function tarefasHtml() {
  return [
    `Mostre o diretório/pasta atual onde você está.`,
    `Crie um diretório chamado <strong>avaliacao</strong>.`,
    `Entre no diretório <strong>avaliacao</strong>.`,
    `Crie um diretório chamado <strong>textos</strong>.`,
    `Crie um diretório chamado <strong>scripts</strong>.`,
    `Crie um diretório chamado <strong>temporarios</strong>.`,
    `Liste o conteúdo do diretório atual mostrando também permissões e arquivos ocultos.`,
    `Crie o arquivo <strong>validacao.txt</strong> com o conteúdo exato: <strong>Linux</strong>.`,
    `Mostre na tela o conteúdo do arquivo <strong>validacao.txt</strong>.`,
    `Mude as permissões de <strong>validacao.txt</strong> para: dono lê/escreve/executa; grupo lê/escreve; outros somente lê.`,
    `Exiba as permissões do arquivo <strong>validacao.txt</strong>.`,
    `Crie o arquivo <strong>show.sh</strong> contendo uma linha que, ao executar, mostre: <strong>Alo mundo</strong>.`,
    `Mostre na tela o conteúdo do arquivo <strong>show.sh</strong>.`,
    `Exiba as permissões iniciais do arquivo <strong>show.sh</strong>.`,
    `Mude as permissões de <strong>show.sh</strong> para permitir execução pelo dono, grupo e outros, mantendo dono com leitura e escrita.`,
    `Exiba novamente as permissões do arquivo <strong>show.sh</strong>.`,
    `Execute o script <strong>show.sh</strong> e confira a saída.`,
    `Crie o arquivo <strong>privado.txt</strong> com qualquer texto.`,
    `Mude as permissões de <strong>privado.txt</strong> para acesso privado do dono: dono lê/escreve; grupo e outros sem acesso.`,
    `Exiba as permissões do arquivo <strong>privado.txt</strong>.`,
    `Mude as permissões de <strong>privado.txt</strong> para leitura, escrita e execução para dono, grupo e outros.`,
    `Exiba novamente as permissões do arquivo <strong>privado.txt</strong>.`
  ].map((x, i) => `<li><strong>Questão ${i + 1}:</strong> ${x}</li>`).join('');
}

function start() {
  const nome = el('nome').value.trim();
  const email = el('email').value.trim().toLowerCase();
  const turma = el('turma').value.trim();
  if (!nome || !email || !turma) {
    alert('Preencha nome, e-mail e turma antes de iniciar.');
    return;
  }
  resetFs();
  Object.assign(state, { iniciado: true, nome, email, turma, semente: gerarCodigoOculto(email), inicio: new Date().toISOString(), history: [] });
  el('boxSemente').classList.remove('oculto');
  el('boxSemente').innerHTML = `Código oculto de verificação gerado e salvo apenas na entrega exportada.`;
  el('listaTarefas').innerHTML = tarefasHtml();
  el('cmd').disabled = false;
  el('cmd').placeholder = 'digite um comando...';
  el('btnTxt').disabled = false;
  el('statusTerminal').textContent = 'em andamento';
  el('terminal').textContent = '';
  print(`Avaliação iniciada. O código oculto de verificação será salvo no arquivo exportado.`);
  print(`Digite help para consultar os comandos disponíveis.`);
  updatePrompt();
  validate();
  el('cmd').focus();
}

function submitCommand(ev) {
  ev.preventDefault();
  if (!state.iniciado) return;
  const input = el('cmd');
  const cmd = input.value.trim();
  if (!cmd) return;
  print(`${promptStr()} ${cmd}`);
  const out = execute(cmd);
  if (out) print(out);
  record(cmd, out);
  input.value = '';
  updatePrompt();
  validate();
}

function entregaObj() {
  validate();
  const total = state.validacoes.length;
  const acertos = state.validacoes.filter(c => c[1]).length;
  return {
    versao: '1.7-v7-codigo-oculto-txt-only-nota-7',
    tipo: 'avaliacao-linux-terminal-virtual',
    nome: state.nome,
    email: state.email,
    turma: state.turma,
    codigoOculto: state.semente,
    inicio: state.inicio,
    fim: new Date().toISOString(),
    pontuacaoAutomatica: {
      acertos,
      total,
      percentual: total ? Math.round(acertos * 100 / total) : 0,
      notaMaxima: NOTA_MAXIMA,
      nota: total ? Number(((acertos / total) * NOTA_MAXIMA).toFixed(2)) : 0,
      valorPorQuestao: total ? Number((NOTA_MAXIMA / total).toFixed(4)) : 0
    },
    validacoes: state.validacoes.map(([item, ok]) => ({ item, ok })),
    comandos: state.history,
    estadoFinal: state.fs
  };
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportTxt() {
  const obj = entregaObj();
  const linhas = [];
  linhas.push('ENTREGA - AVALIAÇÃO LINUX');
  linhas.push(`Nome: ${obj.nome}`);
  linhas.push(`E-mail: ${obj.email}`);
  linhas.push(`Turma: ${obj.turma}`);
  linhas.push(`Código oculto de verificação: ${obj.codigoOculto}`);
  linhas.push(`Início: ${obj.inicio}`);
  linhas.push(`Fim: ${obj.fim}`);
  linhas.push(`Pontuação automática: ${obj.pontuacaoAutomatica.acertos}/${obj.pontuacaoAutomatica.total} (${obj.pontuacaoAutomatica.percentual}%)`);
  linhas.push(`Nota automática: ${formatNota(obj.pontuacaoAutomatica.nota)} / ${formatNota(obj.pontuacaoAutomatica.notaMaxima)}`);
  linhas.push(`Valor por questão: ${formatNota(obj.pontuacaoAutomatica.valorPorQuestao)} ponto(s)`);
  linhas.push('\nVALIDAÇÕES:');
  obj.validacoes.forEach(v => linhas.push(`${v.ok ? '[OK]' : '[  ]'} ${v.item}`));
  linhas.push('\nHISTÓRICO DO TERMINAL:');
  obj.comandos.forEach(h => {
    linhas.push(`$ ${h.cmd}`);
    if (h.saida) linhas.push(h.saida);
  });

  // Bloco usado pelo corretor automático. O aluno pode entregar apenas este TXT.
  linhas.push('\n---DADOS_AUTOMATICOS_INICIO---');
  linhas.push(JSON.stringify(obj));
  linhas.push('---DADOS_AUTOMATICOS_FIM---');

  const safe = (state.nome || 'aluno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  download(`entrega_${safe}.txt`, linhas.join('\n'), 'text/plain');
}

function reiniciar() {
  const msg = 'Reiniciar apaga todos os comandos, arquivos criados e validações desta tentativa. Se ainda não exportou a entrega, exporte antes. Deseja reiniciar mesmo assim?';
  if (!confirm(msg)) return;
  location.reload();
}

el('btnIniciar').addEventListener('click', start);
el('formTerminal').addEventListener('submit', submitCommand);
el('btnTxt').addEventListener('click', exportTxt);
el('btnReiniciar').addEventListener('click', reiniciar);
resetFs();
