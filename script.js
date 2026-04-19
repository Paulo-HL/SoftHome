// script.js

const CONFIG = {
    larguraForroPadrao: 0.20,
    tamanhosBarras: [4, 5, 6, 7]
};

// Histórico de cálculos
let historico = [];
// Guarda último resultado para usar na área PRO
let ultimoResultadoBasico = null;

/* =================== LOGIN SIMPLES =================== */
function carregarUsuario() {
    const raw = localStorage.getItem("usuarioForro");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function salvarUsuario(usuario) {
    localStorage.setItem("usuarioForro", JSON.stringify(usuario));
}

function aplicarUsuarioNaUI(usuario) {
    const overlay = document.getElementById("auth-overlay");
    const userName = document.getElementById("user-name");
    const userPlan = document.getElementById("user-plan");
    const planPill = document.getElementById("plan-pill");
    const avatar = document.querySelector(".avatar-placeholder");

    if (overlay) overlay.style.display = "none";
    if (userName) userName.textContent = usuario.nome || "Usuário";

    const ehPro = usuario.plano === "pro";
    if (userPlan) userPlan.textContent = ehPro ? "Plano PRO" : "Plano Free";
    if (planPill) planPill.textContent = ehPro ? "Plano PRO" : "Plano Free";

    if (avatar && usuario.nome) {
        avatar.textContent = usuario.nome.trim().charAt(0).toUpperCase();
    }

    atualizarEstadoPro(ehPro);
}

function atualizarEstadoPro(ehPro) {
    const proOverlay = document.getElementById("pro-overlay");
    const proContent = document.getElementById("pro-content");
    const badgePro = document.getElementById("badge-pro");

    if (!proOverlay || !proContent || !badgePro) return;

    if (ehPro) {
        proOverlay.style.display = "none";
        proContent.style.opacity = "1";
        proContent.style.pointerEvents = "auto";
        badgePro.textContent = "PRO Ativo";
        badgePro.style.background = "rgba(16,185,129,0.1)";
        badgePro.style.color = "#059669";
        badgePro.style.borderColor = "rgba(16,185,129,0.3)";
    } else {
        proOverlay.style.display = "flex";
        proContent.style.opacity = "0.5";
        proContent.style.pointerEvents = "none";
        badgePro.textContent = "Somente PRO";
        badgePro.style.background = "rgba(249, 115, 22, 0.1)";
        badgePro.style.color = "#f97316";
        badgePro.style.borderColor = "rgba(249,115,22,0.3)";
    }
}

/* =================== CÁLCULO PRINCIPAL =================== */
function calcular() {
    const ladoA = parseFloat(document.getElementById("ladoA").value);
    const ladoB = parseFloat(document.getElementById("ladoB").value);
    const modo = document.getElementById("modo").value;
    const larguraForro = parseFloat(document.getElementById("larguraForro").value) || CONFIG.larguraForroPadrao;
    const resultadoDiv = document.getElementById("resultado");

    if (!validarEntradas(ladoA, ladoB, larguraForro, resultadoDiv)) {
        ultimoResultadoBasico = null;
        return;
    }

    let resultado = null;

    switch (modo) {
        case "A":
            resultado = calcularNormal("A", ladoA, ladoB, larguraForro);
            break;
        case "B":
            resultado = calcularNormal("B", ladoA, ladoB, larguraForro);
            break;
        case "corte":
            resultado = calcularComCorte(ladoA, ladoB, larguraForro);
            break;
        default: {
            // AUTOMÁTICO: testa normal A, normal B e corte, pega menor perda
            const resultadoA = calcularNormal("A", ladoA, ladoB, larguraForro);
            const resultadoB = calcularNormal("B", ladoA, ladoB, larguraForro);
            const resultadoCorte = calcularComCorte(ladoA, ladoB, larguraForro);

            const candidatos = [];

            if (resultadoA) {
                candidatos.push({
                    ...resultadoA,
                    perdaEquivalente: parseFloat(resultadoA.sobraTotal)
                });
            }

            if (resultadoB) {
                candidatos.push({
                    ...resultadoB,
                    perdaEquivalente: parseFloat(resultadoB.sobraTotal)
                });
            }

            if (resultadoCorte) {
                candidatos.push({
                    ...resultadoCorte,
                    perdaEquivalente: parseFloat(resultadoCorte.perdaTotal)
                });
            }

            if (!candidatos.length) {
                resultado = null;
            } else {
                candidatos.sort((a, b) => a.perdaEquivalente - b.perdaEquivalente);
                resultado = candidatos[0];
            }
            break;
        }
    }

    exibirResultado(resultado, resultadoDiv);

    if (resultado) {
        ultimoResultadoBasico = {
            ...resultado,
            ladoA,
            ladoB,
            larguraForro
        };

        adicionarAoHistorico({
            data: new Date(),
            dimensoes: { ladoA, ladoB, larguraForro },
            modo,
            resultado
        });
    } else {
        ultimoResultadoBasico = null;
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
        sentido,
        tipo: "Sem corte",
        barras,
        tamanhoBarra: melhor.tamanho,
        sobraTotal: (melhor.sobra * barras).toFixed(2),
        larguraForro
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
            const pecasPorBarra = Math.floor(tamanho / opcao.comprimento);

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
                <p><strong>Não é possível realizar o cálculo com essas medidas.</strong></p>
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

/* =================== HISTÓRICO =================== */
function adicionarAoHistorico(item) {
    if (historico.length >= 10) {
        historico.pop();
    }

    historico.unshift(item);
    atualizarHistorico();
    salvarHistorico();
}

function atualizarHistorico() {
    const listaHistorico = document.getElementById("lista-historico");
    if (!listaHistorico) return;

    listaHistorico.innerHTML = "";

    if (!historico.length) {
        listaHistorico.innerHTML = `<li class="microcopy">Nenhum cálculo ainda.</li>`;
        return;
    }

    historico.forEach((item, index) => {
        const li = document.createElement("li");
        const dataFormatada = new Date(item.data).toLocaleString();

        li.innerHTML = `
            <div class="historico-item">
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Dimensões:</strong> ${item.dimensoes.ladoA}m x ${item.dimensoes.ladoB}m</p>
                <p><strong>Resultado:</strong> ${item.resultado.barras} barras de ${item.resultado.tamanhoBarra}m</p>
                <button class="btn-secondary btn-small" onclick="carregarDoHistorico(${index})">Carregar</button>
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
    if (!item) return;

    document.getElementById("ladoA").value = item.dimensoes.ladoA;
    document.getElementById("ladoB").value = item.dimensoes.ladoB;
    document.getElementById("larguraForro").value = item.dimensoes.larguraForro;

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
    calcular();
}

/* =================== ÁREA PRO =================== */
function calcularPro() {
    const usuario = carregarUsuario();
    if (!usuario || usuario.plano !== "pro") {
        alert("Área exclusiva para plano PRO. Faça upgrade para utilizar.");
        return;
    }

    if (!ultimoResultadoBasico) {
        alert("Primeiro execute o cálculo de forro para poder calcular os custos.");
        return;
    }

    const precoBarra = parseFloat(document.getElementById("precoBarra").value);
    const precoMaoObra = parseFloat(document.getElementById("precoMaoObra").value) || 0;
    const resultadoProDiv = document.getElementById("resultado-pro");

    if (!precoBarra || isNaN(precoBarra) || precoBarra <= 0) {
        resultadoProDiv.innerHTML = `
            <div class="erro">
                <p>Informe um <strong>preço por barra</strong> válido para prosseguir.</p>
            </div>
        `;
        return;
    }

    const { barras, tamanhoBarra, ladoA, ladoB } = ultimoResultadoBasico;
    const area = ladoA * ladoB;

    const custoMateriais = barras * precoBarra;
    const custoMaoObra = area * precoMaoObra;
    const custoTotal = custoMateriais + custoMaoObra;

    resultadoProDiv.innerHTML = `
        <p><strong>Resumo financeiro PRO</strong></p>
        <p><strong>Quantidade de barras:</strong> ${barras} un de ${tamanhoBarra} m</p>
        <p><strong>Preço por barra:</strong> R$ ${precoBarra.toFixed(2)}</p>
        <p><strong>Custo total de materiais:</strong> R$ ${custoMateriais.toFixed(2)}</p>
        <p><strong>Área do ambiente:</strong> ${area.toFixed(2)} m²</p>
        <p><strong>Mão de obra por m²:</strong> R$ ${precoMaoObra.toFixed(2)}</p>
        <p><strong>Custo total de mão de obra:</strong> R$ ${custoMaoObra.toFixed(2)}</p>
        <p><strong>CUSTO TOTAL ESTIMADO:</strong> R$ ${custoTotal.toFixed(2)}</p>
    `;
}

/* =================== INICIALIZAÇÃO =================== */
document.addEventListener("DOMContentLoaded", () => {
    // Login
    const usuarioExistente = carregarUsuario();
    if (usuarioExistente) {
        aplicarUsuarioNaUI(usuarioExistente);
    }

    const authForm = document.getElementById("auth-form");
    if (authForm) {
        authForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const nome = document.getElementById("nome").value.trim();
            const email = document.getElementById("email").value.trim();
            const plano = document.getElementById("tipo-conta").value;

            if (!nome || !email) return;

            const usuario = { nome, email, plano };
            salvarUsuario(usuario);
            aplicarUsuarioNaUI(usuario);
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("usuarioForro");
            location.reload();
        });
    }

    const btnTornarPro = document.getElementById("btn-tornar-pro");
    if (btnTornarPro) {
        btnTornarPro.addEventListener("click", () => {
            const usuario = carregarUsuario();
            if (!usuario) {
                alert("Entre ou cadastre-se primeiro.");
                return;
            }
            usuario.plano = "pro";
            salvarUsuario(usuario);
            aplicarUsuarioNaUI(usuario);
            alert("Plano PRO ativado (simulação).");
        });
    }

    const btnUpgradePro = document.getElementById("btn-upgrade-pro");
    if (btnUpgradePro) {
        btnUpgradePro.addEventListener("click", () => {
            const usuario = carregarUsuario();
            if (!usuario) {
                alert("Entre ou cadastre-se primeiro.");
                return;
            }
            usuario.plano = "pro";
            salvarUsuario(usuario);
            aplicarUsuarioNaUI(usuario);
            alert("Plano PRO ativado (simulação).");
        });
    }

    // Calculadora
    const btnCalcular = document.getElementById("btn-calcular");
    if (btnCalcular) btnCalcular.addEventListener("click", calcular);

    const btnLimpar = document.getElementById("btn-limpar");
    if (btnLimpar) {
        btnLimpar.addEventListener("click", () => {
            document.getElementById("ladoA").value = "";
            document.getElementById("ladoB").value = "";
            document.getElementById("larguraForro").value = "";
            document.getElementById("resultado").innerHTML = `
                <p>Insira as medidas e clique em <strong>Calcular</strong>.</p>
            `;
            ultimoResultadoBasico = null;
            const resPro = document.getElementById("resultado-pro");
            if (resPro) {
                resPro.innerHTML = `
                    <p>Faça primeiro o cálculo de forro, depois preencha os preços e clique em <strong>Calcular custo total</strong>.</p>
                `;
            }
        });
    }

    const btnCalcularPro = document.getElementById("btn-calcular-pro");
    if (btnCalcularPro) btnCalcularPro.addEventListener("click", calcularPro);

    // Histórico
    carregarHistorico();

    // Botões da “pasta” de histórico
    const btnToggleHistorico = document.getElementById("btn-toggle-historico");
    const historyBody = document.getElementById("history-body");
    if (btnToggleHistorico && historyBody) {
        btnToggleHistorico.addEventListener("click", () => {
            historyBody.classList.toggle("collapsed");
            btnToggleHistorico.textContent = historyBody.classList.contains("collapsed")
                ? "Mostrar"
                : "Ocultar";
        });
    }

    const btnLimparHistorico = document.getElementById("btn-limpar-historico");
    if (btnLimparHistorico) {
        btnLimparHistorico.addEventListener("click", () => {
            historico = [];
            salvarHistorico();
            atualizarHistorico();
        });
    }
});