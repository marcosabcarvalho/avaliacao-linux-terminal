#!/bin/sh
# Avaliação prática - Linux, arquivos e permissões - versão v86 simples
# Esta versão gera um relatório copiável. O código de verificação fica oculto nos desafios.

limpa() { clear 2>/dev/null || true; }
linha() { echo "------------------------------------------------------------"; }
pausa() { echo; echo "Pressione ENTER para continuar..."; read dummy; }
agora() { date 2>/dev/null || echo "data_indisponivel"; }

limpa
linha
echo "AVALIACAO PRATICA INDIVIDUAL - LINUX, ARQUIVOS E PERMISSOES"
linha
echo "No final, sera gerado um RELATORIO para copiar e colar no Classroom."
echo "O codigo de verificacao nao precisa ser usado nos comandos."
linha

printf "Nome completo: "; read NOME
printf "E-mail: "; read EMAIL
printf "Turma: "; read TURMA

if command -v cksum >/dev/null 2>&1; then
  CODIGO_OCULTO=$( (echo "$EMAIL"; date; echo $$) | cksum | awk '{print ($1 % 9000) + 1000}')
else
  CODIGO_OCULTO=$(( ($$ % 9000) + 1000 ))
fi

BASE="avaliacao"
VALID="validacao.txt"
SHOW="show.sh"
PRIV="privado.txt"
REL="relatorio_avaliacao.txt"

{
  echo "ENTREGA - AVALIACAO LINUX / V86"
  echo "Nome: $NOME"
  echo "E-mail: $EMAIL"
  echo "Turma: $TURMA"
  echo "Codigo oculto de verificacao: $CODIGO_OCULTO"
  echo "Inicio: $(agora)"
  linha
} > "$REL"

registrar() {
  echo >> "$REL"
  echo "\$ $1" >> "$REL"
  sh -c "$1" >> "$REL" 2>&1
}

mostrar_tarefa() { linha; echo "$1"; linha; }

limpa
echo "A avaliacao foi iniciada. Execute os comandos pedidos em cada desafio."
echo "O codigo oculto sera salvo no relatorio final."
pausa

mostrar_tarefa "DESAFIO 1 - localizar-se e criar a pasta da avaliacao"
echo "Execute, um por vez: pwd, criar diretorio avaliacao, entrar nele e mostrar pwd novamente."
pausa

registrar "pwd"
mkdir "$BASE" 2>/dev/null
cd "$BASE" || exit 1
registrar "pwd"

mostrar_tarefa "DESAFIO 2 - criar diretorios e listar"
echo "Crie os diretorios textos, scripts e temporarios, um por comando. Depois liste com detalhes."
pausa

mkdir textos 2>/dev/null
mkdir scripts 2>/dev/null
mkdir temporarios 2>/dev/null
registrar "ls -la"

mostrar_tarefa "DESAFIO 3 - arquivo de validacao"
echo "Crie validacao.txt com o texto Linux. Depois mostre o conteudo com cat."
pausa

echo "Linux" > "$VALID"
registrar "cat $VALID"
registrar "ls -l $VALID"

mostrar_tarefa "DESAFIO 4 - permissao 764"
echo "Mude as permissoes de validacao.txt para: dono rwx, grupo rw-, outros r--. Depois liste."
pausa

chmod 764 "$VALID" 2>/dev/null
registrar "ls -l $VALID"

mostrar_tarefa "DESAFIO 5 - script executavel"
echo "Crie show.sh contendo echo \"Alo mundo\". Mostre, liste, torne executavel e execute."
pausa

echo "echo \"Alo mundo\"" > "$SHOW"
registrar "cat $SHOW"
registrar "ls -l $SHOW"
chmod 755 "$SHOW" 2>/dev/null
registrar "ls -l $SHOW"
registrar "./$SHOW"

mostrar_tarefa "DESAFIO 6 - comparar 600 e 777"
echo "Crie privado.txt. Depois aplique chmod 600, liste, aplique chmod 777 e liste novamente."
pausa

echo "arquivo privado" > "$PRIV"
chmod 600 "$PRIV" 2>/dev/null
registrar "ls -l $PRIV"
chmod 777 "$PRIV" 2>/dev/null
registrar "ls -l $PRIV"

{
  linha
  echo "ESTADO FINAL"
  echo "Diretorio atual: $(pwd)"
  echo
  echo "Listagem geral:"
  ls -la
  echo
  echo "Fim: $(agora)"
  linha
} >> "$REL" 2>&1

cd .. 2>/dev/null || true
limpa
linha
echo "RELATORIO FINAL GERADO"
linha
echo "Copie tudo abaixo e cole na atividade do Classroom."
echo "Se conseguir baixar/anexar arquivo, use tambem o arquivo: $BASE/$REL"
linha
cat "$BASE/$REL"
linha
echo "Fim."
