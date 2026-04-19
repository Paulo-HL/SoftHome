const CONFIG = {
    larguraForroPadrao: 0.20,
    tamanhosBarras: [4, 5, 6, 7]
};

// Histórico de cálculos
let historico = [];

/**
 * Função principal de cálculo
 * Obtém os valores dos inputs, valida e executa o cálculo apropriado
 */
function calcular() {
    const ladoA = parseFloat(document.getElementById("ladoA").value);
    const ladoB = parseFloat(document.getElementById("ladoB").value);
    const modo = document.getElementById("modo").value;
    const larguraForro = parseFloat(document.getElementById("larguraForro").value) || CONFIG.larguraForroPadrao;
    const resultadoDiv = document.getElementById("resultado");

    // Validar entradas
    if (!validarEntradas(ladoA, ladoB, larguraForro, resultadoDiv)) {
        return;
    }

    // Executar cálculo baseado no modo selecionado
    let resultado = null;

    switch(modo) {
        case "A":
            resultado = calcularNormal("A", ladoA, ladoB, larguraForro);
            break;
        case "B":
            resultado = calcularNormal("B", ladoA, ladoB, larguraForro);
            break;
        case "corte":
            resultado = calcularComCorte(ladoA, ladoB, larguraForro);
            break;
        default: // Automático
            const resultadoA = calcularNormal("A", ladoA, ladoB, larguraForro);
            const resultadoB = calcularNormal("B", ladoA, ladoB, larguraForro);

            // Seleciona o resultado com menor sobra
            resultado = resultadoA && resultadoB 
                ? (parseFloat(resultadoA.sobraTotal) <= parseFloat(resultadoB.sobraTotal) ? resultadoA : resultadoB) 
                : resultadoA || resultadoB;
    }
// Chama a função que monta o HTML para dentro do resultadoDiv
    exibirResultado(resultado, resultadoDiv);

    // Adicionar ao histórico
    if (resultado) {
        adicionarAoHistorico({
            data: new Date(),
            dimensoes: { ladoA, ladoB, larguraForro },
            modo,
            resultado
        });
    }
}


function validarEntradas(ladoA, ladoB, larguraForro, resultadoDiv) {
    if (!ladoA || !ladoB || isNaN(ladoA) || isNaN(ladoB) || ladoA <= 0 || ladoB <= 0) {
        resultadoDiv.innerHTML = `
            <div class="erro">
                <p>Por favor, preencha os dois lados com valores válidos maiores que zero.</p>
            </div>
        `;
        return false;
    }

    if (!larguraForro || isNaN(larguraForro) || larguraForro <= 0) {
        resultadoDiv.innerHTML = `
            <div class="erro">
                <p>Por favor, informe uma largura de forro válida maior que zero.</p>
            </div>
        `;
        return false;
    }

    return true;
}

function calcularNormal(sentido, ladoA, ladoB, larguraForro) {
    const comprimento = sentido === "A" ? ladoA : ladoB;
    const largura = sentido === "A" ? ladoB : ladoA;

    const barras = Math.ceil(largura / larguraForro);

    let melhor = null;
/*Loop em todos os tamanhos possiveis 4, 5, 6, 7.*/
    CONFIG.tamanhosBarras.forEach(tamanho => {
        const sobra = tamanho - comprimento;
        if (sobra >= 0) {
            if (!melhor || sobra < melhor.sobra) {
                melhor = { tamanho, sobra };
            }
        }
    });

    if (!melhor) return null;

    return {
        sentido, /*sentido do forro, A ou B*/
        tipo: "Sem corte",
        barras, /*quantidade de reguas */
        tamanhoBarra: melhor.tamanho, /*4, 5, 6 ou 7*/  
        sobraTotal: (melhor.sobra * barras).toFixed(2), /*sobra por brras multiplicada pela quantidade de barras*/
        larguraForro /*largura do forro usada para o cálculo*/
    };
}

function calcularComCorte(ladoA, ladoB, larguraForro) {
    let melhor = null;

    [
        { sentido: "A", comprimento: ladoA, largura: ladoB },
        { sentido: "B", comprimento: ladoB, largura: ladoA }
    ].forEach(opcao => {
        const linhas = Math.ceil(opcao.largura / larguraForro);

        CONFIG.tamanhosBarras.forEach(tamanho => {
            const pecasPorBarra = Math.floor(tamanho / opcao.comprimento); /*quantidade de peças do comprimento cabem dentro de 1 barras*/

            if (pecasPorBarra >= 2) {
                const barrasNecessarias = Math.ceil(linhas / pecasPorBarra);
                const sobraPorBarra = tamanho - (pecasPorBarra * opcao.comprimento);
                const perdaTotal = sobraPorBarra * barrasNecessarias;

                if (!melhor || perdaTotal < melhor.perdaTotal) {
                    melhor = {
                        sentido: opcao.sentido,
                        tipo: "Com corte",
                        tamanhoBarra: tamanho,
                        barras: barrasNecessarias,
                        pecasPorBarra,
                        sobraPorBarra: sobraPorBarra.toFixed(2),
                        perdaTotal: perdaTotal.toFixed(2),
                        larguraForro
                    };
                }
            }
        });
    });

    return melhor;
}

function exibirResultado(resultado, resultadoDiv) {
    if (!resultado) {
        resultadoDiv.innerHTML = `
            <div class="alerta">
                <h3>Resultado</h3>
                <p><strong>Não é possível realizar o cálculo com corte para essas medidas.</strong></p>
                <p>Tente outras dimensões ou outro modo de cálculo.</p>
            </div>
        `;
        return;
    }

    resultadoDiv.innerHTML = `
        <div class="resultado-container">
            <h3>Resultado</h3>
            <p><strong>Sentido do forro:</strong> Lado ${resultado.sentido}</p>
            <p><strong>Tipo de cálculo:</strong> ${resultado.tipo}</p>
            <p><strong>Tamanho da barra:</strong> ${resultado.tamanhoBarra} m</p>
            <p><strong>Quantidade de barras:</strong> ${resultado.barras}</p>
            ${resultado.pecasPorBarra ? `<p><strong>Peças por barra:</strong> ${resultado.pecasPorBarra}</p>` : ""}
            ${resultado.sobraPorBarra ? `<p><strong>Sobra por barra:</strong> ${resultado.sobraPorBarra} m</p>` : ""}
            <p><strong>Perda total:</strong> ${resultado.perdaTotal || resultado.sobraTotal} m</p>
        </div>
    `;
}

function adicionarAoHistorico(item) {
    // Limitar o histórico a 10 itens
    if (historico.length >= 10) {
        historico.pop();
    }

    // Adicionar novo item ao início
    historico.unshift(item);

    // Atualizar a exibição do histórico
    atualizarHistorico();

    // Salvar no localStorage
    salvarHistorico();
}

function atualizarHistorico() {
    const listaHistorico = document.getElementById("lista-historico");
    listaHistorico.innerHTML = "";

    historico.forEach((item, index) => {
        const li = document.createElement("li");
        const dataFormatada = new Date(item.data).toLocaleString();

        li.innerHTML = `
            <div class="historico-item">
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Dimensões:</strong> ${item.dimensoes.ladoA}m x ${item.dimensoes.ladoB}m</p>
                <p><strong>Resultado:</strong> ${item.resultado.barras} barras de ${item.resultado.tamanhoBarra}m</p>
                <button onclick="carregarDoHistorico(${index})">Carregar</button>
            </div>
        `;

        listaHistorico.appendChild(li);
    });
}

function salvarHistorico() {
   localStorage.setItem("historicoForro", JSON.stringify(historico));
}

function carregarHistorico() {
    const historicoSalvo = localStorage.getItem("historicoForro");
    if (historicoSalvo) {
        historico = JSON.parse(historicoSalvo);
        atualizarHistorico();
    }
}

function carregarDoHistorico(index) {
    const item = historico[index];

    document.getElementById("ladoA").value = item.dimensoes.ladoA;
    document.getElementById("ladoB").value = item.dimensoes.ladoB;
    document.getElementById("larguraForro").value = item.dimensoes.larguraForro;

    // Encontrar o modo correspondente
    let modoSelecionado = "auto";
    if (item.modo) {
        modoSelecionado = item.modo;
    } else if (item.resultado.tipo === "Com corte") {
        modoSelecionado = "corte";
    } else if (item.resultado.sentido === "A") {
        modoSelecionado = "A";
    } else if (item.resultado.sentido === "B") {
        modoSelecionado = "B";
    }

    document.getElementById("modo").value = modoSelecionado;

    // Recalcular para mostrar o resultado
    calcular();
}

// Carregar histórico ao iniciar a página
document.addEventListener("DOMContentLoaded", carregarHistorico);
