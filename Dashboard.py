import streamlit as st
import pandas as pd
import plotly.express as px

# Configuração da página
st.set_page_config(page_title="Dashboard de Vendas", page_icon=":bar_chart:", layout="wide")

st.title("📊 Dashboard de Vendas - Análise Completa")

# Sidebar - Upload dos Dados
st.sidebar.header("📂 Upload dos Dados")
arquivo = st.sidebar.file_uploader("Escolha um arquivo CSV ou Excel", type=["csv", "xlsx"])

if arquivo:
    # Ler arquivo
    if arquivo.name.endswith('.csv'):
        df = pd.read_csv(arquivo)
    else:
        df = pd.read_excel(arquivo)

    # Sidebar - Filtros
    st.sidebar.header("🎯 Filtros")

    ano = st.sidebar.multiselect("Ano:", options=df["Ano"].unique(), default=df["Ano"].unique())
    mes = st.sidebar.multiselect("Mês:", options=df["Mês"].unique(), default=df["Mês"].unique())
    produto = st.sidebar.multiselect("Produto:", options=df["Produto"].unique(), default=df["Produto"].unique())
    regiao = st.sidebar.multiselect("Região:", options=df["Região"].unique(), default=df["Região"].unique())
    canal = st.sidebar.multiselect("Canal:", options=df["Canal"].unique(), default=df["Canal"].unique())
    categoria = st.sidebar.multiselect("Categoria:", options=df["Categoria"].unique(), default=df["Categoria"].unique())

    # Aplicar filtros
    df_filtros = df.query(
        "Ano == @ano and Mês == @mes and Produto == @produto and Região == @regiao and Canal == @canal and Categoria == @categoria"
    )

    # ---- Layout de KPIs ----
    st.subheader("🔢 Métricas Principais")
    col1, col2, col3 = st.columns(3)

    total_vendas = float(df_filtros["Vendas"].sum())
    media_vendas = float(df_filtros["Vendas"].mean()) if not df_filtros.empty else 0
    maior_venda = float(df_filtros["Vendas"].max()) if not df_filtros.empty else 0

    col1.metric("💰 Total de Vendas", f"R$ {total_vendas:,.2f}")
    col2.metric("📈 Média de Vendas", f"R$ {media_vendas:,.2f}")
    col3.metric("🏆 Maior Venda", f"R$ {maior_venda:,.2f}")

    # ---- Gráfico de Barras ----
    st.subheader("📊 Vendas por Produto e Mês")
    grafico_barras = px.bar(
        df_filtros,
        x="Mês",
        y="Vendas",
        color="Produto",
        barmode="group",
        text_auto=True,
        facet_col="Ano"
    )
    st.plotly_chart(grafico_barras, use_container_width=True)

    # ---- Gráfico de Pizza ----
    st.subheader("🥧 Distribuição de Vendas por Produto")
    grafico_pizza = px.pie(
        df_filtros,
        names="Produto",
        values="Vendas",
        hole=0.4
    )
    st.plotly_chart(grafico_pizza, use_container_width=True)

    # ---- Gráfico de Linha - Tendência ----
    st.subheader("📈 Tendência de Vendas ao Longo dos Meses")
    grafico_linha = px.line(
        df_filtros.groupby(["Ano", "Mês"]).sum(numeric_only=True).reset_index(),
        x="Mês",
        y="Vendas",
        color="Ano",
        markers=True
    )
    st.plotly_chart(grafico_linha, use_container_width=True)

    # ---- Tabela de Dados ----
    st.subheader("🗂️ Dados Filtrados")
    st.dataframe(df_filtros)

else:
    st.info("👈 Faça o upload de um arquivo CSV ou Excel para visualizar o dashboard.")