import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Dashboard de Orçamento vs Custo Real", page_icon=":bar_chart:", layout="wide")

st.title("📊 Dashboard Comparativo - Orçamento vs Custo Real")

# Upload dos arquivos
st.sidebar.header("📂 Upload dos Dados")
orcamento_file = st.sidebar.file_uploader("Selecione o arquivo de Orçamento (Excel)", type=["xlsx"])
real_file = st.sidebar.file_uploader("Selecione o arquivo de Custo Real (Excel)", type=["xlsx"])

if orcamento_file and real_file:
    # Ler os arquivos
    orcamento = pd.read_excel(orcamento_file)
    custo_real = pd.read_excel(real_file)

    # Padronizar colunas
    orcamento.rename(columns={
        'codigo': 'Codigo',
        'tipo': 'Tipo',
        'descricao': 'Descricao',
        'quantidade': 'Quantidade_Orcada',
        'custo unitário': 'Custo_Unitario_Orcado',
        'custo total': 'Custo_Total_Orcado'
    }, inplace=True)

    custo_real.rename(columns={
        'Material': 'Codigo',
        'Tipo': 'Tipo',
        'Descrição': 'Descricao',
        'QUANTIDADE': 'Quantidade_Real',
        'VALOR UNITÁRIO': 'Custo_Unitario_Real',
        'VALOR TOTAL': 'Custo_Total_Real'
    }, inplace=True)

    # Converter códigos para string
    orcamento['Codigo'] = orcamento['Codigo'].astype(str)
    custo_real['Codigo'] = custo_real['Codigo'].astype(str)

    # Merge
    df = pd.merge(orcamento, custo_real, on=['Codigo', 'Descricao', 'Tipo'], how='outer')

    # Calcular variações
    df['Variação_Quantidade_%'] = ((df['Quantidade_Real'] - df['Quantidade_Orcada']) / df['Quantidade_Orcada']) * 100
    df['Variação_Custo_Unitario_%'] = ((df['Custo_Unitario_Real'] - df['Custo_Unitario_Orcado']) / df['Custo_Unitario_Orcado']) * 100
    df['Variação_Custo_Total_%'] = ((df['Custo_Total_Real'] - df['Custo_Total_Orcado']) / df['Custo_Total_Orcado']) * 100

    df.fillna(0, inplace=True)
    df.replace([float('inf'), float('-inf')], 0, inplace=True)

    # KPIs
    total_orcado = df['Custo_Total_Orcado'].sum()
    total_real = df['Custo_Total_Real'].sum()
    desvio_total = total_real - total_orcado
    aderencia = (total_real / total_orcado) * 100 if total_orcado != 0 else 0

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("💰 Total Orçado", f"R$ {total_orcado:,.2f}")
    col2.metric("💸 Total Real", f"R$ {total_real:,.2f}")
    col3.metric("📉 Desvio Total", f"R$ {desvio_total:,.2f}")
    col4.metric("📊 Aderência", f"{aderencia:.2f}%")

    st.divider()

    # Gráfico de Barras - Custo Total
    st.subheader("🔍 Comparação de Custo Total por Item")
    grafico_barras = px.bar(
        df,
        x="Descricao",
        y=["Custo_Total_Orcado", "Custo_Total_Real"],
        barmode="group",
        title="Custo Orçado vs Real por Item"
    )
    st.plotly_chart(grafico_barras, use_container_width=True)

    # Gráfico de Pizza - Distribuição dos Custos
    st.subheader("🥧 Distribuição dos Custos Reais")
    pizza = px.pie(
        df,
        names="Descricao",
        values="Custo_Total_Real",
        title="Distribuição dos Custos Reais por Item"
    )
    st.plotly_chart(pizza, use_container_width=True)

    # Tabela detalhada
    st.subheader("📑 Detalhamento dos Itens")
    st.dataframe(df)

else:
    st.info("👈 Faça upload dos arquivos para gerar o dashboard.")