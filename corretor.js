const el = (id) => document.getElementById(id);
let entregas = [];

function formatNota(valor) {
  const n = Number(valor ?? 0);
  return n.toFixed(2).replace('.', ',');
}

function escapeCsv(v) {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function render() {
  if (!entregas.length) {
    el('resumo').textContent = 'Nenhum arquivo importado.';
    el('btnCsv').disabled = true;
    return;
  }
  el('btnCsv').disabled = false;
  const rows = entregas.map((e, idx) => {
    const p = e.pontuacaoAutomatica || {};
    const checks = e.validacoes || [];
    const falhas = checks.filter(c => !c.ok).map(c => c.item).join(' | ');
    return `<tr>
      <td>${idx + 1}</td>
      <td>${e.nome || ''}</td>
      <td>${e.email || ''}</td>
      <td>${e.turma || ''}</td>
      <td>${e.codigoOculto || e.semente || ''}</td>
      <td><strong>${p.acertos ?? ''}/${p.total ?? ''}</strong></td>
      <td><strong>${formatNota(p.nota)} / ${formatNota(p.notaMaxima ?? 7)}</strong></td>
      <td>${p.percentual ?? ''}%</td>
      <td>${(e.comandos || []).length}</td>
      <td>${falhas || 'Sem falhas automáticas'}</td>
    </tr>`;
  }).join('');
  el('resumo').innerHTML = `<table style="width:100%; border-collapse:collapse; min-width:980px;">
    <thead><tr>
      <th>#</th><th>Nome</th><th>E-mail</th><th>Turma</th><th>Código oculto</th><th>Itens</th><th>Nota</th><th>%</th><th>Comandos</th><th>Falhas</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <style>th,td{border:1px solid #d9e0ef;padding:8px;text-align:left;vertical-align:top} th{background:#eef2ff}</style>`;
}

async function loadFiles(ev) {
  const files = [...ev.target.files];
  for (const f of files) {
    try {
      const text = await f.text();
      const ini = '---DADOS_AUTOMATICOS_INICIO---';
      const fim = '---DADOS_AUTOMATICOS_FIM---';
      const a = text.indexOf(ini);
      const b = text.indexOf(fim);
      if (a < 0 || b < 0 || b <= a) {
        throw new Error('TXT sem bloco de dados automáticos. Peça ao aluno para exportar novamente pela página da avaliação.');
      }
      const jsonText = text.slice(a + ini.length, b).trim();
      const obj = JSON.parse(jsonText);
      obj.__arquivo = f.name;
      entregas.push(obj);
    } catch (err) {
      alert(`Erro ao ler ${f.name}: ${err.message}`);
    }
  }
  render();
}

function exportCsv() {
  const headers = ['arquivo','nome','email','turma','codigo_oculto','acertos','total','nota','nota_maxima','percentual','qtd_comandos','falhas'];
  const lines = [headers.join(';')];
  for (const e of entregas) {
    const p = e.pontuacaoAutomatica || {};
    const falhas = (e.validacoes || []).filter(c => !c.ok).map(c => c.item).join(' | ');
    lines.push([
      e.__arquivo, e.nome, e.email, e.turma, (e.codigoOculto || e.semente),
      p.acertos, p.total, p.nota, (p.notaMaxima ?? 7), p.percentual, (e.comandos || []).length, falhas
    ].map(escapeCsv).join(';'));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'correcao_avaliacao_linux.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

el('files').addEventListener('change', loadFiles);
el('btnCsv').addEventListener('click', exportCsv);
el('btnLimpar').addEventListener('click', () => { entregas = []; el('files').value = ''; render(); });
render();
