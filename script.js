
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    "https://prffblgjpmyhspazhhvr.supabase.co",
    "sb_publishable_2dPZBezbL79SlLaDJIkKtA_HNI6AIIW"
);

const divPosts = document.getElementById("posts");
const input = document.getElementById("input");
const btnPostar = document.getElementById("btnPostar");

// sistema de respostas
let postSelecionadoParaResponder = null;
let ultimaRequisicao = 0;

// aviso de resposta no formulario
const avisoResposta = document.createElement("div");
avisoResposta.className = "resposta-atual";
avisoResposta.hidden = true;

const textoAviso = document.createElement("span");
const btnCancelarResposta = document.createElement("button");

btnCancelarResposta.type = "button";
btnCancelarResposta.textContent = "Cancelar";
btnCancelarResposta.className = "cancelar-resposta";

avisoResposta.append(textoAviso, btnCancelarResposta);

input.insertAdjacentElement("beforebegin", avisoResposta);

// seleciona uma postagem para responder
function selecionarPostParaResponder(post) {

    postSelecionadoParaResponder = post.id;

    textoAviso.textContent = `Respondendo à postagem No. ${post.id}`;

    avisoResposta.hidden = false;

    input.focus();
}

// cancela a resposta
function cancelarResposta() {

    postSelecionadoParaResponder = null;

    avisoResposta.hidden = true;

    input.focus();
}

btnCancelarResposta.addEventListener("click", cancelarResposta);

// cria o elemento visual de uma postagem

function criarPost(post) {

    const el = document.createElement("article");

    el.className = "post";
    el.dataset.postId = String(post.id);

    // data da postagem
    const cabecalho = document.createElement("div");
    cabecalho.className = "post-cabecalho";

    const dataPost = document.createElement("span");
    dataPost.className = "post-data";

    dataPost.textContent = post.created_at
        ? new Date(post.created_at).toLocaleString("pt-BR")
        : "";

    cabecalho.appendChild(dataPost);

    // conteudo
    const conteudo = document.createElement("div");
    conteudo.className = "post-conteudo";
    conteudo.textContent = post.conteudo;

    // botao responder
    const acoes = document.createElement("div");
    acoes.className = "post-acoes";

    const btnResponder = document.createElement("button");

    btnResponder.type = "button";
    btnResponder.className = "post-responder";
    btnResponder.textContent = "↳ Responder";

    btnResponder.addEventListener("click", () => {
        selecionarPostParaResponder(post);
    });

    acoes.appendChild(btnResponder);

    // respostas
    const respostas = document.createElement("div");
    respostas.className = "post-respostas";
    respostas.hidden = true;

    el.append(
        cabecalho,
        conteudo,
        acoes,
        respostas
    );

    return {
        elemento: el,
        respostas: respostas,
        post: post
    };
}


// carrega e organiza todas as postagens
async function carregarPosts() {

    const requisicao = ++ultimaRequisicao;

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar postagens:", error);
        return;
    } 

    // evita que uma requisicao antiga sobrescreva uma nova
    if (requisicao !== ultimaRequisicao) return;

    const registros = data.map((post) => {
        return criarPost(post);
    });

    // relaciona cada postagem ao seu id
    const postsPorId = new Map();

    registros.forEach((registro) => {
        postsPorId.set(
            String(registro.post.id),
            registro
        );
    });

    // organiza postagens principais e respostas
    registros.forEach((registro) => {

        const post = registro.post;
        const idPai = post.id_referenciado;

        if (idPai !== null && idPai !== undefined) {

            const pai = postsPorId.get(String(idPai));

            // evita referencias invalidas e postagens apontando para si mesmas
            if (
                pai &&
                pai !== registro &&
                new Date(pai.post.created_at) <= new Date(post.created_at)
            ) {

                pai.respostas.hidden = false;
                pai.respostas.appendChild(registro.elemento);

                return;
            }
        }

        // postagem principal
        divPosts.appendChild(registro.elemento);

    });

}

// envia uma postagem ou resposta
async function enviarPost() {

    const texto = input.value.trim();

    if (!texto) return;

    btnPostar.disabled = true;

    const { error } = await supabase
        .from("posts")
        .insert([
            {
                conteudo: texto,
                id_referenciado: postSelecionadoParaResponder
            }
        ]);

    if (error) {

        console.error("Erro ao enviar postagem:", error);

        alert("Não foi possível enviar sua postagem.");

        btnPostar.disabled = false;

        return;
    }

    input.value = "";

    cancelarResposta();

    await carregarPosts();

    btnPostar.disabled = false;

}

// Realtime: detecta novas postagens e respostas
supabase
    .channel("posts-em-tempo-real")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "posts"
        },
        () => {
            carregarPosts();
        }
    )
    .subscribe((status) => {

        console.log("Status do Realtime:", status);

        if (status === "SUBSCRIBED") {
            console.log("Conectado ao Realtime!");
        }

    });

// inicializacao
btnPostar.addEventListener("click", enviarPost);

carregarPosts();

