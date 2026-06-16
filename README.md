# Avaliação prática - Linux, arquivos e permissões

Este pacote contém uma primeira versão da avaliação prática em duas modalidades:

1. **Web / GitHub Pages**: terminal virtual em HTML + CSS + JavaScript, com exportação de entrega somente em TXT.
2. **v86 / terminal real**: script `atividade_v86.sh` para rodar dentro de um Linux no v86 e gerar relatório copiável para o Classroom.

## Arquivos

- `index.html`: página do aluno com terminal virtual.
- `style.css`: estilos da página.
- `app.js`: lógica do terminal virtual, desafios, validação e exportação.
- `corretor.html`: página do professor para importar entregas TXT.
- `corretor.js`: lógica do corretor e exportação CSV.
- `atividade_v86.sh`: versão alternativa para rodar no terminal Linux/v86.
- `roteiro_v86_classroom.txt`: instruções para os alunos usarem a versão v86.

## Como testar localmente

Abra o arquivo `index.html` no navegador.

Depois:

1. Preencha nome, e-mail e turma. A atividade é individual.
2. Clique em **Iniciar avaliação**.
3. Faça os comandos no terminal virtual.
4. Clique em **Exportar entrega TXT**.
5. Abra `corretor.html`.
6. Importe o TXT gerado.
7. Exporte CSV, se desejar.

## Comandos aceitos no terminal virtual

- `pwd`
- `ls`, `ls -l`, `ls -la`, `ls -ld`
- `mkdir`
- `cd`
- `touch`
- `echo "texto" > arquivo.txt`
- `cat`
- `cp`
- `chmod`
- `stat`
- `df -h`
- `./script.sh`
- `help`
- `clear`

## Desafios avaliados

Nesta versão, cada questão pede apenas um comando. Isso deixa a correção mais clara e evita confusão quando o aluno cria diretórios um por vez.

A avaliação gera um **código oculto de verificação** no momento em que o aluno inicia a tentativa. Esse código não aparece nos desafios nem precisa ser usado nos comandos. Ele fica salvo no TXT exportado para ajudar o professor a identificar duplicidades ou entregas copiadas.

Exemplo dos comandos esperados nesta versão:

```bash
pwd
mkdir avaliacao
cd avaliacao
mkdir textos
mkdir scripts
mkdir temporarios
ls -la
echo "Linux" > validacao.txt
cat validacao.txt
chmod 764 validacao.txt
ls -l validacao.txt
echo 'echo "Alo mundo"' > show.sh
cat show.sh
ls -l show.sh
chmod 755 show.sh
ls -l show.sh
./show.sh
echo "arquivo privado" > privado.txt
chmod 600 privado.txt
ls -l privado.txt
chmod 777 privado.txt
ls -l privado.txt
```


## Nota automática

A prova vale **7,0 pontos**. Todas as questões têm o mesmo peso.

Como esta versão possui 22 questões, cada questão vale aproximadamente **0,3182 ponto**. O TXT exportado pelo aluno mostra:

- quantidade de acertos;
- percentual automático;
- nota automática em uma escala de 0 a 7;
- valor de cada questão.

O `corretor.html` também mostra a nota e exporta essa informação no CSV.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos para a raiz do repositório.
3. Acesse **Settings** > **Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/root`.
6. Salve.
7. Aguarde o GitHub gerar a URL.

## Observação sobre segurança

Esta avaliação não busca ser uma prova inviolável. Ela prioriza praticidade, aprendizagem e correção em lote.
Como o código roda no navegador, um aluno avançado poderia inspecionar ou manipular a entrega. Para este objetivo didático, isso é aceitável.


## Reiniciar

O botão Reiniciar recarrega a página e apaga a tentativa atual: comandos digitados, arquivos criados, permissões e validações. O aluno só deve reiniciar antes de começar de novo ou depois de exportar a entrega.


## Versão 1.3

Nesta versão, as questões não exibem mais o comando pronto. O aluno deve interpretar a tarefa e consultar `help` para ver a legenda resumida dos comandos e exemplos genéricos de uso.


## Ajuste da versão v7

A validação mostra o comando principal usado, mas não revela o modo numérico do chmod. Exemplo: “Alterou as permissões com chmod”, em vez de “chmod 764”.

## Ajuste de código oculto

Esta versão deriva da v7, mas remove a semente dos nomes dos arquivos e diretórios exibidos ao aluno. O código de verificação é gerado ocultamente e salvo no TXT exportado.
